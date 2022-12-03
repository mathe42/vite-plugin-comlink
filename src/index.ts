import JSON5 from "json5";
import MagicString from "magic-string";
import { normalizePath, Plugin } from "vite";

const importMetaUrl = `${"import"}.meta.url`;
const urlPrefix_normal = "internal:comlink:";
const urlPrefix_shared = "internal:comlink-shared:";

let mode = "";

export const comlink = () =>
  ({
    name: "comlink",
    configResolved(conf) {
      mode = conf.mode;
    },
    resolveId(id) {
      if (id.includes(urlPrefix_normal) || id.includes(urlPrefix_shared)) {
        return id;
      }
    },
    async load(id) {
      if (id.includes(urlPrefix_normal)) {
        const realID = normalizePath(id.replace(urlPrefix_normal, ""));

        return `
        import { expose } from 'comlink'
        import * as api from '${realID}'

        expose(api)`;
      }

      if (id.includes(urlPrefix_shared)) {
        const realID = normalizePath(id.replace(urlPrefix_shared, ""));

        return `
        import { expose } from 'comlink'
        import * as api from '${realID}'

        addEventListener('connect', (event) => {
          const port = event.ports[0];
            
          expose(api, port);
          // We might need this later...
          // port.start()
        })`;
      }
    },
    transform(code: string) {
      if (
        !code.includes("ComlinkWorker") &&
        !code.includes("ComlinkSharedWorker")
      ) {
        return;
      }

      const workerSearcherRegex =
        /\bnew\s+(ComlinkWorker|ComlinkSharedWorker)\s*\(\s*new\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*\)\s*([^\)]*)\)/g;

      const magicString: MagicString = new MagicString(code);

      function workerReplacer(
        match: string,
        type: "ComlinkWorker" | "ComlinkSharedWorker",
        url: string,
        rest: string,
      ) {
        url = url.slice(1, url.length - 1);

        const posOfMatch = code.indexOf(match);
        const positionOfOptions = rest.indexOf(",") + 1;

        let replacementClass = type === "ComlinkWorker"
          ? "Worker"
          : "SharedWorker";

        let optsJSON = "";

        if (positionOfOptions !== -1) {
          const optsParsed = JSON5.parse(
            rest
              .slice(positionOfOptions)
              .split(")")[0]
              .trim(),
          );

          if (mode === "development") {
            optsParsed.type = "module";
          }

          if (optsParsed.replacement) {
            replacementClass = optsParsed.replacement;
          }

          optsJSON = "," + JSON.stringify(optsParsed);
        } else {
          if (mode === "development") {
            optsJSON = ', { type: "module" }';
          }
        }

        const insertCode = `wrap(
        new ${replacementClass}(
          new URL(
            '${
          type === "ComlinkWorker" ? urlPrefix_normal : urlPrefix_shared
        }${url}', 
            ${importMetaUrl}
          )
          ${optsJSON}
        )${type === "ComlinkSharedWorker" ? ".port" : ""}
      )`;

        magicString.overwrite(
          posOfMatch,
          posOfMatch + match.length,
          insertCode,
        );
        return match;
      }

      code.replace(workerSearcherRegex, workerReplacer);
      magicString.appendLeft(0, `import {wrap} from 'comlink';\n`);

      return {
        code: magicString.toString(),
        map: magicString.generateMap(),
      };
    },
  }) as Plugin;

export default comlink;
