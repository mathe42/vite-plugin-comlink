import { defineConfig } from "vite";
import comlink from "../src/index";
import { join, dirname } from "node:path";

const map = {
  name: 'map',
  resolveId(source, importer, options) {
      if(importer == "vite-plugin-comlink") {
        return join(dirname(import.meta.url), '..')
      }
  },
}

export default defineConfig({
  plugins: [
    comlink(),
    map
  ],
  worker: {
    plugins: () => ([
        comlink(),
        map
    ])
  }
});