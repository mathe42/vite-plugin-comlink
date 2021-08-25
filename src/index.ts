import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { Plugin, ResolvedConfig } from "vite";
import { rollup } from "rollup";

function getAssetHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}

export function inWorker(plugin: Plugin): Plugin {
  (plugin as any)._inWorker = true;
  return plugin;
}

let internal_schema = "comlink-internal:";

interface ComlinkPluginOptions {
  /**
   * Enable type generation
   * @default false
   */
  types?: boolean;
  /**
   * Set import schema to use
   * @default comlink:
   */
  schema?: string;
  /**
   * Internal plugins that are used in worker build.
   *
   * Use only when you know what you do!
   */
  internal_worker_plugins?: string[];
  /**
   * Filename of type file
   * @default comlink.d.ts
   */
  typeFile?: string;
  /**
   * Use module Worker in production
   * @default false
   */
  moduleWorker?: boolean;
}

export default function comlink({
  moduleWorker = false,
  types = false,
  schema = "comlink:",
  typeFile = "comlink.d.ts",
  internal_worker_plugins = [
    "alias",
    "vite:modulepreload-polyfill",
    "vite:resolve",
    "vite:esbuild",
    "vite:json",
    "vite:wasm",
    "vite:asset",
    "vite:define",
    "commonjs",
    "vite:data-uri",
    "rollup-plugin-dynamic-import-variables",
    "asset-import-meta-url",
    "vite:import-analysis",
    "vite:esbuild-transpile",
    "vite:terser",
    "vite:reporter",
    "load-fallback",
  ],
}: ComlinkPluginOptions = {}): Plugin {
  let typesFile = "";
  let data: Record<string, string> = {};

  let isBuild = false;
  let config: ResolvedConfig;
  let timer: NodeJS.Timeout | null = null;

  function createTypes() {
    const data_json = "//" + JSON.stringify(data);
    const types = Object.entries(data)
      .map(([id, real]) => {
        if (real.endsWith(".ts")) real = real.slice(0, real.length - 3);
        if (real[0] == "/" || real[0] == "\\") real = "." + real;
        if (real.startsWith(config.root))
          real = "." + real.slice(config.root.length);

        return moduleDefinition(id, real);
      })
      .join("");

    writeFileSync(typesFile, data_json + types);
  }

  return inWorker({
    name: "comlink",
    configResolved(resolvedConfig) {
      // Save all Config
      isBuild = resolvedConfig.command === "build";
      config = resolvedConfig;
      if (types) {
        // setup types
        typesFile = join(config.root, typeFile);
        if (!isBuild && existsSync(typesFile)) {
          data = JSON.parse(
            readFileSync(typesFile, "utf-8").split("\n")[0].slice(2)
          );
        }
      }
    },
    async resolveId(id, importer) {
      // Path through
      if (id.startsWith(internal_schema)) {
        return id;
      }
      // Not this plugin
      if (!id.startsWith(schema)) {
        return;
      }

      // Resolve file
      const realPath = id.slice(schema.length);
      const realID = (await this.resolve(realPath, importer))?.id.slice(
        config.root.length
      );

      if (!realID) throw new Error(`Worker module ${realPath} not found`);

      // Create types
      if (!isBuild && types) {
        if (data[id] != realID) {
          data[id] = realID;

          if (!timer) {
            timer = setTimeout(() => {
              createTypes();
              timer = null;
            }, 2000);
          }
        }
      }

      return schema + realID;
    },
    buildEnd() {
      // Ensure types are created at least once
      if (types) {
        createTypes();
      }
    },
    async load(id) {
      if (id.startsWith(schema)) {
        // ID of Worker file
        const baseId = `${internal_schema}${id.slice(schema.length)}`;
        // URL used to load worker
        let url = `/@id/${baseId}`;

        if (isBuild && !moduleWorker) {
          // Bundle worker file in new context
          const bundle = await rollup({
            input: baseId,
            plugins: config.plugins.filter(
              (v) =>
                (v as any)._inWorker || internal_worker_plugins.includes(v.name)
            ),
          });
          let code: string;
          try {
            const { output } = await bundle.generate({
              format: "iife",
              sourcemap: config.build.sourcemap,
            });

            code = output[0].code;
          } finally {
            await bundle.close();
          }

          // Set filename
          const content = Buffer.from(code);
          const p = id.split(/\/|\\/g);
          const b = p[p.length - 1].split(".");
          const basename = b.slice(0, b.length - 1).join(".");
          const contentHash = getAssetHash(content);
          const fileName = join(
            config.build.assetsDir,
            `${basename}.${contentHash}.js`
          );
          // get real URL variable
          url = `__VITE_ASSET__${this.emitFile({
            fileName,
            type: "asset",
            source: code,
          })}__`;
        }

        if (isBuild && moduleWorker) {
          url = baseId;
        }

        return `
          import { wrap } from 'comlink'

          let workers = []

          if (import.meta.hot) {
            import.meta.hot.dispose((data) => {
              workers.forEach(worker => worker.terminate())
            })
          }

          export default () => {
            const worker = new Worker('${url}'${
              !isBuild || moduleWorker ? ", {type: 'module'}" : ""
            })
            ${!isBuild ? "workers.push(worker)" : ""}
            wrap(worker)
          }
        `;
      }

      // Create workerfile
      if (id.startsWith(internal_schema)) {
        return `
          // Dev-Vite env
          ${!isBuild ? "import '/@vite/env'" : ""}
          import { expose } from 'comlink'
          import * as m from '${id.slice(internal_schema.length)}'
          
          expose(m)
        `;
      }
    },
  });
}
function moduleDefinition(id: string, real: string): string {
  return `
declare module "${id}" {
  const mod: () => import("comlink").Remote<typeof import("${real}")>
  export default mod
}
`;
}

