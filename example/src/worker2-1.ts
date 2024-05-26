const w = new ComlinkWorker<typeof import('./worker2-2')>(new URL("./worker2-2.ts", import.meta.url))
export const add = (a: number,b: number) => w.add(a,b)
