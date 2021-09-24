# vite-plugin-comlink

Use WebWorkers with comlink. 

This plugin removes the need to call `expose`, `wrap` from comlink and also you don't need to create the worker on your own. This plugin provides a function that returns for each call a new wraped worker with all exposed values and functions.

### Install

```sh
npm i --save-dev vite-plugin-comlink # yarn add -D vite-plugin-comlink
npm i --save comlink # yarn add comlink
```

### Comlink install
As you don't want to wait for a new release for this plugin when a new version of comlink is releast this plugin has comlink as a peer dependencie so you can install the version of comlink that you need.

### Add it to vite.config.js

```ts
// vite.config.js
import comlink from 'vite-plugin-comlink'

export default {
  plugins: [
    comlink({types: true})
  ],
}
```
### Useage
```ts
// worker.ts
export const add = (a: number, b: number) => a + b

// main.ts
import add_worker from 'comlink:./worker'

// Create Worker
const instance = add_worker()
const result = await instance.add(2, 3)

result === 5
```

See the comlink docs (https://github.com/GoogleChromeLabs/comlink) for more examples. 


## Options

```ts
// vite.config.js
import comlink from 'vite-plugin-comlink'

export default {
  plugins: [
    comlink({
      /**
       * Enable type generation
       * @default false
       */
      types: false,
      /**
       * Set import schema to use
       * @default comlink:
       */
      schema: "comlink:",
      /**
       * Internal plugins that are used in worker build.
       * 
       * Use only when you know what you do!
       * 
       * @default "see source code"
       */
      internal_worker_plugins: [],
      /**
       * Filename of type file
       * @default comlink-workers.d.ts
       */
      typeFile: "comlink-workers.d.ts",
      /**
       * Use module Worker in production
       * for support see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules
       * @default false
       */
      moduleWorker: false
    })
  ],
}
```

## Plugins in Worker build
To use a Plugin in the worker build you have to wrap it in the exportet `inWorker` function like this:

```ts
// vite.config.ts

import { inWorker } from 'vite-plugin-comlink'
import customPlugin from 'vite-plugin-custom'

export default {
  plugins: [
    inWorker(customPlugin({
      optionA: true
    }))
  ]
}
```

This will add an internal flag so we can detect these modules.


## Types
See https://github.com/GoogleChromeLabs/comlink#typescript for some drawbacks / limitations of typescript.

If you enable types, a `.d.ts` file is generated at runtime that types your imports! This makes typescript realy simple. Ensure that typescript includes the `.d.ts` file.

## Module Worker
Not all Browsers support module Workers (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules).
This results in some Drawbacks for fastest and best support:

For fast development we use module Workers as bundleling the complete worker on the fly is not performant.

In default settings we bundle the whole worker at build to a single file. Therefor all borwsers that supports Workers work in production. 
You can set the option `moduleWorker` to `true` to also use module worker in production. But that is (currently) not recomended. 

> Note: When Firefox (in development) and Safari (supports it in TP) have shiped the feature the default of `moduleWorker` will probably change to `true`. This will be a breaking change and come with a major version bump.

### What this means:

1. In development you need a browser that supports module Worker (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)
2. In production (unless setting `moduleWorker` to `true`) all browsers are supported

## HMR
This module doesn't support full HMR out of the box. But if you implement accepting HMR updates (probably only plugin authors that use this plugin will do it). All workers are killed at a HMR update. 

## Ressources
https://github.com/GoogleChromeLabs/comlink  
https://github.com/surma/rollup-plugin-comlink
