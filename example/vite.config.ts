import { defineConfig } from "vite";
import comlink from "../src/index";

export default defineConfig({
  plugins: [
    comlink()
  ],
  worker: {
    plugins: () => ([
        comlink()
    ])
  }
});