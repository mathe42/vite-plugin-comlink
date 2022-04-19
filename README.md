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
const instance = new ComlinkWorker<typeof api>(new URL('./worker.js', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5


// Create SharedWorker
const instance = new ComlinkSharedWorker<typeof api>(new URL('./worker.js', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5
```

## Inline, ServiceWorker
Are no longer supported. If vite adds support I will add it here.

## Module Worker
Not all Browsers support module Workers (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules).
This results in some Drawbacks for fastest and best support:

For fast development we use module Workers as bundleling the complete worker on the fly is not performant.

In default settings we bundle the whole worker at build to a single file. Therefor all browsers that supports Workers work in production. 

This is the same behavior as vite and it is NOT CHANGEABLE!

### What this means:

1. In development you need a browser that supports module Worker (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)
2. In production (unless setting `moduleWorker` to `true`) all browsers are supported


## Migration guide from v2 to v3
Basicly check all code for usage and change it to new syntax.



## Ressources
https://github.com/GoogleChromeLabs/comlink  
https://github.com/surma/rollup-plugin-comlink
