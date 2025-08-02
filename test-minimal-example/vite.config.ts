import { defineConfig } from 'vite'
import { comlink } from 'vite-plugin-comlink'

export default defineConfig({
  plugins: [comlink()],
  worker: {
    plugins: () => [comlink()]
  },
  build: {
    sourcemap: true
  }
})