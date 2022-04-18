# vite-plugin-comlink

Use WebWorkers with comlink. 

This plugin removes the need to call `expose`, `wrap` from comlink and also you don't need to create the worker on your own.

## Install

```sh
npm i --save-dev vite-plugin-comlink # yarn add -D vite-plugin-comlink
npm i --save comlink # yarn add comlink
```

### vite-plugin-worker
Quick setup (with comlink included) would be in the `vite.config.js`:

```ts
import comlink from 'vite-plugin-comlink'

export default {
  plugins: [
    comlink()
  ],
}
```

### Comlink install
As you don't want to wait for a new release for this plugin when a new version of comlink is releast this plugin has comlink as a peer dependencie so you can install the version of comlink that you need.

### Add it to vite.config.js

```ts
// vite.config.js
import comlink from 'vite-plugin-comlink'

export default {
  plugins: [
    comlink()
  ],
}
```
## Usage (with types!)
```ts
// worker.ts
export const add = (a: number, b: number) => a + b

// main.ts
import * as api from './worker'

// Create Worker
const instance: ComlinkRemote<typeof api> = new ComlinkWorker(new URL('./worker.js', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5
```

## Inline, SharedWorker, ServiceWorker
Are not supported. If vite supports inline worker I will add it! Shared worker I will add as I need them in my own project but in a way with WebLocksApi so we can have a Workaround for Browser not supporting SharedWorker.

For shared Worker I will add a `ComlinkSharedWorker` class.

## ToDo
Before release I need to add the following things
- [ ] Types (`ComlinkWorker`) global type
- [ ] Docs for `replacement` option
- [ ] State Aware Worker (extra Plugin or integrate it here)

## Migration guide from v2 to v3
Basicly check all code for usage and change it to new syntax.

## Ressources
https://github.com/GoogleChromeLabs/comlink  
https://github.com/surma/rollup-plugin-comlink
