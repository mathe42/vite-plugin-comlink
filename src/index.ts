import JSON5 from "json5";
import MagicString from "magic-string";
import { normalizePath, Plugin } from "vite";

const importMetaUrl = `${"import"}.meta.url`;
const urlPrefix_normal = "internal:comlink:";
const urlPrefix_shared = "internal:comlink-shared:";

const workerWrap = (url: string) => `
import {expose} from 'comlink';
import * as api from '${url}';
expose(api);`;

const sharedWorkerWrap = (url: string) => `
import {expose} from 'comlink';
import * as api from '${url}';

addEventListener('connect', (event) => {
  const port = event.ports[0];

  expose(api, port);
  // We might need this later...
  // port.start();
})`;

export function comlink({
  replacement = "Worker",
  replacementShared = "SharedWorker",
} = {}): Plugin {
  let mode = "";

  return {
    name: "comlink",
    configResolved(conf) {
      mode = conf.mode;
    },
    resolveId(id) {
      if (id.includes(urlPrefix_normal) || id.includes(urlPrefix_shared)) {
        return id;
      }
    },
    load(id) {
      if (id.includes(urlPrefix_normal)) {
        return workerWrap(normalizePath(id.replace(urlPrefix_normal, "")));
      }

      if (id.includes(urlPrefix_shared)) {
        return sharedWorkerWrap(
          normalizePath(id.replace(urlPrefix_shared, "")),
        );
      }
    },
    transform(code: string) {
      // Early exit
      if (
        !code.includes("ComlinkWorker") &&
        !code.includes("ComlinkSharedWorker")
      ) {
        return;
      }

      const workerSearcher =
        /\bnew\s+(ComlinkWorker|ComlinkSharedWorker)\s*\(\s*new\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*\)\s*(.*)\)/g;

      const mStr: MagicString = new MagicString(code);

      function workerReplacer(
        match: string,
        type: "ComlinkWorker" | "ComlinkSharedWorker",
        url: string,
        rest: string,
      ) {
        url = url.slice(1, url.length - 1);

        const startOfThisCode = code.indexOf(match);
        const restKommaIndex = rest.indexOf(",");

        const options: WorkerOptions & { replacement?: string } =
          restKommaIndex === -1 ? {} : JSON5.parse(
            rest
              .slice(restKommaIndex + 1)
              .split(")")[0]
              .trim(),
          );

        if (mode === "development") {
          options.type = "module";
        }

        const replacementClass = options.replacement
          ? options.replacement
          : (type === "ComlinkWorker" ? replacement : replacementShared);

        const prefix = type === "ComlinkWorker"
          ? urlPrefix_normal
          : urlPrefix_shared;

        const insertCode = `__comlink_wrap(
          new ${replacementClass}(
            new URL(
              '${prefix}${url}', 
              ${importMetaUrl}
            ),
            ${JSON.stringify(options)}
          )
          ${type === "ComlinkSharedWorker" ? ".port" : ""}
        )`;

        mStr.overwrite(
          startOfThisCode,
          startOfThisCode + match.length,
          insertCode,
        );
        
        return match;
      }

      code.replace(workerSearcher, workerReplacer);

      mStr.appendLeft(0, `import {wrap as __comlink_wrap} from 'comlink';\n`);

      return {
        code: mStr.toString(),
        map: mStr.generateMap(),
      };
    },
  };
}
