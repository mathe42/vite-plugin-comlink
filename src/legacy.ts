import { Plugin } from "vite";

const importMetaUrl = `${"import"}.meta.url`;
const legacyPrefixNormal = "comlink:";
const legacyPrefixShared = "comlink-shared:";

export const legacyWorker: Plugin = {
  name: "comlink:legacy",
  async resolveId(id: string, importer: string) {
    if (!id.startsWith(legacyPrefixNormal)) return;

    console.warn(
      `[vite-plugin-comlink]: The usage of \`import worker from ${JSON.stringify(
        id
      )}\` is deprecated please move to the \`new ComlinkWorker(...)\` syntax.`
    );

    const realID = await this.resolve(
      id.slice(legacyPrefixNormal.length),
      importer
    );

    if (!realID) return;

    return legacyPrefixNormal + realID.id;
  },
  load(id: string) {
    if (!id.startsWith(legacyPrefixNormal)) return;

    const realID = id.slice(legacyPrefixNormal.length);

    return `
      export default () => new ComlinkWorker(new URL(${JSON.stringify(
        realID
      )}, ${importMetaUrl}))
    `;
  },
};

export const legacySharedWorker: Plugin = {
  name: "comlink:legacy:shared",
  async resolveId(id: string, importer: string) {
    if (!id.startsWith(legacyPrefixShared)) return;

    console.warn(
      `[vite-plugin-comlink]: The usage of \`import worker from ${JSON.stringify(
        id
      )}\` is deprecated please move to the \`new ComlinkSharedWorker(...)\` syntax.`
    );

    const realID = await this.resolve(
      id.slice(legacyPrefixShared.length),
      importer
    );

    if (!realID) return;

    return legacyPrefixShared + realID.id;
  },
  load(id: string) {
    if (!id.startsWith(legacyPrefixShared)) return;

    const realID = id.slice(legacyPrefixShared.length);

    return `
      export default () => new ComlinkWorker(new URL(${JSON.stringify(
        realID
      )}, ${importMetaUrl}))
    `;
  },
};
