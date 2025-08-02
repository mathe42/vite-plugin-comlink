import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/symbol.ts'],
  format: ['esm'],
  dts: true,
  clean: true
})