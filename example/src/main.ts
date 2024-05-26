import { endpointSymbol } from "vite-plugin-comlink/symbol";

const w = new ComlinkWorker<typeof import('./worker')>(new URL("./worker.ts", import.meta.url))
const x = w[endpointSymbol]

console.log(x)
console.log(await w.add(5,3))