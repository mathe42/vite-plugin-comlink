import JSON5 from 'json5'
import MagicString from "magic-string";
import { Plugin, normalizePath } from "vite";
const importMetaUrl = `${'import'}.meta.url`


const urlPrefix_normal = 'comlink:'
const urlPrefix_shared = 'comlink-shared:'

let mode = ''

export function comlink({replacement = 'Worker'} = {}): Plugin {
    return {
        configResolved(conf) {
            mode = conf.mode
        },
        name: 'ex',
        async load(id) {
            if (id.includes(urlPrefix_normal)) {
                const realID = normalizePath(id.replace(urlPrefix_normal, ''))
                
                return `
                    import {expose} from 'comlink'
                    import * as api from '${normalizePath(realID)}'

                    expose(api)
                `;
            }

            if(id.includes(urlPrefix_shared)) {
                const realID = normalizePath(id.replace(urlPrefix_normal, ''))
                
                return `
                    import {expose} from 'comlink'
                    import * as api from '${normalizePath(realID)}'

                    addEventListener('connect' (ev) => {
                        const port = event.ports[0];
                          
                        expose(api, port);
                    })
                `;
            }
        },
        transform(code: string, id: string) {
            if (!code.includes('ComlinkWorker') && !code.includes('ComlinkSharedWorker'))
                return;

            const workerSearcher = /\bnew\s+(ComlinkWorker|ComlinkSharedWorker)\s*(<\s*typeof\s*[a-zA-Z]+\s*>)?\s*\(\s*new\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*\)\s*(.*)\)/g;

            let s: MagicString = new MagicString(code);

            function workerReplacer(match: string, type: 'ComlinkWorker' | 'ComlinkSharedWorker', ts: string, url: string, rest: string) {
                url = url.slice(1, url.length - 1);

                const index = code.indexOf(match);
                
                const i = rest.indexOf(',')

                let reClass = replacement

                if(i!== -1) {
                    const opt = JSON5.parse(rest.slice(i+1).split(')')[0].trim())

                    if(mode === 'development') {
                        opt.type = 'module'
                    }

                    if(opt.replacement) {
                        reClass = opt.replacement
                    }

                    rest = ',' + JSON.stringify(opt) + ')'
                }

                const insertCode = `wrap(new ${reClass}(new URL('${type === 'ComlinkWorker' ? urlPrefix_normal : urlPrefix_shared}${url}', ${importMetaUrl})${rest}${type === 'ComlinkSharedWorker' ? '.port' : ''})`;

                s.overwrite(index, index + match.length, insertCode);
                return match;
            }

            code.replace(workerSearcher, workerReplacer);

            s.appendLeft(0, `import {wrap} from 'comlink';\n`);

            return {
                code: s.toString(),
                map: s.generateMap()
            };
        }
    };
}
