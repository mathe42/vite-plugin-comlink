import JSON5 from "json5";
import MagicString from "magic-string";
import { Plugin, normalizePath } from "vite";

const importMetaUrl = `${"import"}.meta.url`;
const urlPrefix_normal = "internal:comlink:";
const urlPrefix_shared = "internal:comlink-shared:";

let mode = "";

export function comlink({
  replacement = "Worker",
  replacementShared = "SharedWorker",
} = {}): Plugin {
  return {
    name: "comlink",
    configResolved(conf) {
      mode = conf.mode;
    },
    resolveId(id) {
      if (id.includes(urlPrefix_normal) || id.includes(urlPrefix_shared))
        return id;
    },
    async load(id) {
      if (id.includes(urlPrefix_normal)) {
        const realID = normalizePath(id.replace(urlPrefix_normal, ""));

        return `
          import {expose} from 'comlink'
          import * as api from '${normalizePath(realID)}'

          expose(api)
        `;
      }

      if (id.includes(urlPrefix_shared)) {
        const realID = normalizePath(id.replace(urlPrefix_normal, ""));

        return `
          import {expose} from 'comlink'
          import * as api from '${normalizePath(realID)}'

          addEventListener('connect', (event) => {
            const port = event.ports[0]; 
              
            expose(api, port);
            // We might need this later...
            // port.start()
          })
        `;
      }
    },
    transform(code: string, id: string) {
      // Early exit
      if (
        !code.includes("ComlinkWorker") &&
        !code.includes("ComlinkSharedWorker")
      )
        return;

      const workerSearcher =
        /\bnew\s+(ComlinkWorker|ComlinkSharedWorker)\s*\(\s*new\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*\)\s*(.*)\)/g;

      let mStr: MagicString = new MagicString(code);

      function workerReplacer(
        match: string,
        type: "ComlinkWorker" | "ComlinkSharedWorker",
        url: string,
        rest: string
      ) {
        url = url.slice(1, url.length - 1);

        const index = code.indexOf(match);

        const restKommaIndex = rest.indexOf(",");

        let replacementClass =
          type === "ComlinkWorker" ? replacement : replacementShared;

        if (restKommaIndex !== -1) {
          const opt = JSON5.parse(
            rest
              .slice(restKommaIndex + 1)
              .split(")")[0]
              .trim()
          );

          if (mode === "development") {
            opt.type = "module";
          }

          if (opt.replacement) {
            replacementClass = opt.replacement;
          }

          rest = `,${JSON.stringify(opt)}`
        } else {
          if (mode === "development") {
            rest += ',{type: "module"}';
          }
        }

        const prefix = type === "ComlinkWorker" ? urlPrefix_normal : urlPrefix_shared

        const insertCode = `__comlink_wrap(
          new ${replacementClass}(
            new URL(
              '${prefix}${url}', 
              ${importMetaUrl}
            )
            ${rest}
          )
          ${type === "ComlinkSharedWorker" ? ".port" : ""}
        )`;

        mStr.overwrite(index, index + match.length, insertCode);
        return match;
      }

      code.replace(workerSearcher, workerReplacer);

      mStr.appendLeft(0, `import {wrap as __comlink_wrap} from 'comlink';\n`);

      return {
        code: mStr.toString(),
        map: mStr.generateMap(),
      };
    },
  }
}

export default comlink;
