import { Plugin } from "vite";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { posix as path } from "path";
const { join } = path;

export interface ComlinkPluginOptions {
  customConfigs?: Record<`${string}:`, string>;
  typeFile?: string | false;
}

const internalIds: string[] = [
  "comlink@main:",
  "comlink@main-sw:",
  "comlink@worker:",
  "comlink@sharedWorker:",
  "comlink@serviceWorker:",
  "comlink@main-sharedWorker:",
];

export default function comlink({
  customConfigs = {},
  typeFile = false,
}: ComlinkPluginOptions = {}): Plugin {
  const publicIds: Record<string, string> = {
    "comlink:": "comlink@main:worker:comlink@worker:",
    "comlink-shared:":
      "comlink@main-sharedWorker:sharedWorker:comlink@sharedWorker:",
    "comlink-sw:": "comlink@main-sw:serviceworker:comlink@serviceWorker:",
    ...customConfigs,
  };

  let typeDefs: Array<[string, string]> = [];
  let root: string | null = null;
  let typeSaveFile: string | null = null;

  function writeTypeDefs() {
    if (!typeFile || !root) return;

    // Remove duplicates
    typeDefs = typeDefs.filter(
      (v, i, t) =>
        t.findIndex(([id, real]) => id === v[0] && real == v[1]) === i
    );

    const content = typeDefs
      .map(([id, real]) => moduleDefinition(id, real))
      .join("\n");

    writeFileSync(join(root, typeFile), content);

    if (typeSaveFile) {
      writeFileSync(typeSaveFile, JSON.stringify(typeDefs));
    }
  }

  return {
    name: "comlink",
    buildEnd() {
      writeTypeDefs();
    },
    configResolved(config) {
      if (existsSync(config.cacheDir!)) {
        typeSaveFile = join(config.cacheDir!, "comlink.json");
        if (existsSync(typeSaveFile)) {
          typeDefs = JSON.parse(readFileSync(typeSaveFile, "utf-8"));
        }
      }
      root = config.root;
    },
    async resolveId(id, importer) {
      const keys = Object.keys(publicIds);
      for (let i = 0; i < keys.length; i++) {
        if (id.startsWith(keys[i])) {
          const real = await this.resolve(id.slice(keys[i].length), importer);

          if (!real) throw new Error("Comlink Worker File Not Found!");

          const importPath = real.id.startsWith(root!)
            ? real.id.slice(root!.length)
            : real.id;

          typeDefs.push([
            id,
            "." +
              (importPath.endsWith(".ts")
                ? importPath.substr(0, importPath.length - 3)
                : importPath),
          ]);
          writeTypeDefs();

          return publicIds[keys[i]] + importPath;
        }
      }

      for (let i = 0; i < internalIds.length; i++) {
        if (id.startsWith(internalIds[i])) {
          return id;
        }
      }
    },
    load(id) {
      let realFile: string | null = null;
      let schema: string | null = null;
      for (let i = 0; i < internalIds.length; i++) {
        if (id.startsWith(internalIds[i])) {
          realFile = id.slice(internalIds[i].length);
          schema = internalIds[i];
        }
      }

      if (!realFile) return;

      switch (schema) {
        case "comlink@main:":
          return `
            import { wrap } from 'comlink'
            import createWorker from ${JSON.stringify(realFile)}

            export default () => wrap(new createWorker())
          `;
        case "comlink@main-sharedWorker:":
          return `
            import { wrap } from 'comlink'
            import createWorker from ${JSON.stringify(realFile)}

            export default () => wrap((new createWorker()).port)
          `;
        case "comlink@worker:":
          return `
            import * as workerContent from ${JSON.stringify(realFile)}
            import { expose } from 'comlink'

            expose(workerContent)
          `;
        case "comlink@sharedWorker:":
          return `
            import * as workerContent from ${JSON.stringify(realFile)}
            import { expose } from 'comlink'

            onconnect = (e) => expose(workerContent, e.ports[0])
          `;
        case "comlink@serviceWorker:":
          return `
            import { expose } from 'comlink'
            import * as workerContent from ${JSON.stringify(realFile)}
            self.addEventListener("message", (event) => {
              if (event.data.comlinkInit) {
                expose(workerContent, event.data.port);
              }
            });
          `;
        case "comlink@main-sw:":
          console.warn(`[vite-plugin-comlink] the usage with service worker will be removed in version 3!`)
          return `
            import { wrap, releaseProxy } from 'comlink'
            import registerSW from ${JSON.stringify(realFile)}

            const COMLINK_PROXY = {sw: null}

            async function initComlink() {
              const { port1, port2 } = new MessageChannel();
              const msg = {
                comlinkInit: true,
                port: port1,
              };
              navigator.serviceWorker.controller.postMessage(msg, [port1]);
              
              if(COMLINK_PROXY.sw) {
                proxy[releaseProxy]();
              }

              COMLINK_PROXY.sw = wrap(port2)
            }


            export default async function registerSW(opts = {}) {
              if (navigator.serviceWorker.controller) {
                await initComlink();
              }
              navigator.serviceWorker.addEventListener("controllerchange", initComlink);
              await registerSW(opts)
              return COMLINK_PROXY
            }
          `;
      }

      throw new Error("NOT REACHABLE CODE REACHED");
    },
  };
}

function moduleDefinition(id: string, real: string): string {
  if (id.startsWith("comlink-sw:")) {
    return `
      declare module "${id}" {
        const mod: () => {sw: import("comlink").Remote<typeof import("${real}")>}
        export default mod
      }`;
  } else {
    return `
      declare module "${id}" {
        const mod: () => import("comlink").Remote<typeof import("${real}")>
        export default mod
      }`;
  }
}
