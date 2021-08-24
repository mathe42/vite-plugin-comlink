import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { Plugin } from "vite";

export default function comlink({ types = false }: { types: boolean }): Plugin {
  const SCHEMA_MAIN_THREAD = "comlink:";
  const SCHEMA_WORKER = "comlink-worker:";
  let data: Record<string, string> = {};
  let typeFile: string;

  function createTypes() {
    if (!typeFile) return;

    const dTS =
      `//${JSON.stringify(data)}\n` +
      Object.entries(data)
        .map(([id, realPath]) => {
          return `
            declare module "${id}" {
              const mod:import("comlink").Remote<typeof import("${
                realPath.endsWith(".ts")
                  ? realPath.slice(0, realPath.length - 3)
                  : realPath
              }")>
              export default mod
            }
          `;
        })
        .join("");

    writeFileSync(typeFile, dTS);
  }
  let timer: NodeJS.Timeout | null;
  let isBuild = false;

  return {
    name: "comlink",
    configResolved(resolvedConfig) {
      if (types) {
        typeFile = join(resolvedConfig.root, "comlink.d.ts");
      }
      isBuild = resolvedConfig.command === "build";

      if (types && existsSync(typeFile)) {
        data = JSON.parse(
          readFileSync(typeFile, "utf-8").split("\n")[0].slice(2)
        );
      }
    },
    async resolveId(id, importer) {
      if (id.includes(SCHEMA_WORKER)) {
        return id;
      }
      if (id.startsWith(SCHEMA_MAIN_THREAD)) {
        const realPath = id.slice(SCHEMA_MAIN_THREAD.length);
        const newId = (await this.resolve(realPath, importer))?.id;

        if (!newId) throw Error(`Cannot find module '${realPath}'`);

        if (types && data[id] !== newId) {
          data[id] = newId;

          if (!timer) {
            timer = setTimeout(() => {
              timer = null;
              createTypes();
            }, 2000);
          }
        }

        return SCHEMA_MAIN_THREAD + newId;
      }
    },
    closeBundle() {
      if (types) createTypes();
    },
    async load(id) {
      if (id.startsWith(SCHEMA_MAIN_THREAD)) {
        const realPath = id.slice(SCHEMA_MAIN_THREAD.length);

        return `
          import { wrap } from "comlink";
          import MyWorker from "${SCHEMA_WORKER}${realPath}?worker"
          export default wrap(MyWorker())
        `;
      }
      if (id.startsWith(SCHEMA_WORKER) && id.endsWith("?worker")) {
        return "";
      }
      if (id.includes(SCHEMA_WORKER) && id.endsWith("?worker_file")) {
        const path = id.split(SCHEMA_WORKER)[1].split("?")[0];

        return `
          import * as workerContent from "${path}"
          import { expose } from "comlink";
          expose(workerContent);
        `;
      }
    },
  };
}
