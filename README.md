# vite-plugin-comlink

Use WebWorkers with comlink. 

This plugin removes the need to call `expose`, `wrap` from comlink and also you don't need to create the worker on your own. This plugin provides a function that returns for each call a new wraped worker with all exposed values and functions.

### Install

```sh
npm i --save-dev vite-plugin-comlink # yarn add -D vite-plugin-comlink
```

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
       * @default comlink.d.ts
       */
      typeFile: "comlink.d.ts"
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

## Drawbacks
Not all Browsers support module Workers (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules). This results in some Drawbacks for fastest and best compat.

As Safari TP just added support I will add a option to change to the module Workers in production which will only work in the listed Browsers.

### Dev
You have to develop in a Browser that supports module Workers: (https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)

### Production
Each worker ist bundled in a new context. So no code spliting betwen Workers and / or main app. This results in larger bundles and loadtime!

## Ressources
https://github.com/GoogleChromeLabs/comlink
https://github.com/surma/rollup-plugin-comlink