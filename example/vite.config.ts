import { defineConfig } from "vite";
import comlink from "../src/index";
import { join, dirname } from "node:path";
import inspect from "vite-plugin-inspect";

export default defineConfig({
  plugins: [
    comlink(),
    inspect()
  ],
  worker: {
    plugins: () => ([
        comlink()
    ])
  }
});