# vite-plugin-comlink

> This plugins requires vite >=2.8 for WebWorkers and vite >= 2.9.6 for shared worker to work properly.

Use WebWorkers with comlink. 

This plugin removes the need to call `expose`, `wrap` from comlink and also you don't need to create the worker on your own.

## Install

```sh
npm i --save-dev vite-plugin-comlink # yarn add -D vite-plugin-comlink
npm i --save comlink # yarn add comlink
```

### Comlink install
As you don't want to wait for a new release for this plugin when a new version of comlink is released, this plugin has comlink as a peer dependency so you can install the version of comlink that you need.

### Add it to vite.config.js

```ts
// vite.config.js
import { comlink } from 'vite-plugin-comlink'

export default {
  plugins: [
    comlink()
  ],
  worker: {
    plugins: [
      comlink()
    ]
  }
}
```

### Plugin order
Put this plugin as one of the first plugins. Only other plugins that create `ComlinkWorker` or `ComlinkSharedWorker` or transform files based on the existence of  `ComlinkWorker` or `ComlinkSharedWorker` should come before this plugin!

## Usage 
```ts
// worker.js
export const add = (a: number, b: number) => a + b

// main.ts

// Create Worker
const instance = new ComlinkWorker(new URL('./worker.js', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5


// Create SharedWorker
const instance = new ComlinkSharedWorker(new URL('./worker.js', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5
```

### With TypeScript
Add 

```ts
/// <reference types="vite-plugin-comlink/client" />
```
to your vite-env.d.ts file to make sure typescript will use `vite-plugin-comlink/client`.

```ts
// worker.ts
export const add = (a: number, b: number) => a + b

// main.ts

// Create Worker
const instance = new ComlinkWorker<typeof import('./worker')>(new URL('./worker', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5


// Create SharedWorker
const instance = new ComlinkSharedWorker<typeof import('./worker')>(new URL('./worker', import.meta.url), {/* normal Worker options*/})
const result = await instance.add(2, 3)

result === 5
```


## Module Worker
Not all Browsers support module Workers (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules).

This results in some drawbacks for fastest and best support:

For fast development we use module Workers as bundling the complete worker on the fly is not performant.

In default settings we bundle the whole worker at build to a single file. Therefore all browsers that support Workers, work in production. 

This is the same behavior as vite and it is NOT CHANGEABLE!

If you want a worker to be a module worker in production, add `type: 'module'` to the worker constructor options.

### What this means:

1. In development you need a browser that supports module Worker (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)
2. In production all browsers are supported

## Breaking changes
### v2 to v3
* remove of customConfigs breaking FF support in development for some projects and removing the abbility for inline worker. This is a limitation of vite so if vite adds support of it this plugin will follow
* remove of typefile. For typescript support please write your own type file or switch to the new syntax.
* remove of ServiceWorker support. This was considered unstable an it was hacky so it got removed. If vite adds support for building ServiceWorker this will be added!
* you have to add comlink to `worker.plugins` array.
### v3 to v4
* the import syntax will be removed you have to switch to the new syntax!
* Removal of Warnings of leagacy (v2) options
* ESM support
* Better Source Maps

## Resources
https://github.com/GoogleChromeLabs/comlink  
https://github.com/surma/rollup-plugin-comlink
