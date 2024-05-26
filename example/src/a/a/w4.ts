export const w4 = new ComlinkWorker<typeof import('../../worker')>(new URL("../../worker", import.meta.url))
console.log(await w4.add(6,5))

