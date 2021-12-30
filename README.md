# vite-plugin-comlink

Use WebWorkers with comlink. 

This plugin removes the need to call `expose`, `wrap` from comlink and also you don't need to create the worker on your own. This plugin provides a function that returns for each call a new wraped worker with all exposed values and functions.

## Install

```sh
npm i --save-dev vite-plugin-comlink # yarn add -D vite-plugin-comlink
npm i --save comlink # yarn add comlink
```

### vite-plugin-worker
You have to install `vite-plugin-worker` for this plugin to work properly. Quick setup (with comlink included) would be in the `vite.config.js`:

```ts
import comlink from 'vite-plugin-comlink'
import worker, { pluginHelper } from 'vite-plugin-worker'

export default {
  plugins: [
    comlink(),
    pluginHelper(),
    worker({})
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
## Usage
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

With a sharedWorker:

```ts
// worker.ts
export const add = (a: number, b: number) => a + b

// main.ts
import add_worker from 'comlink-shared:./worker'

// Create Worker
const instance = add_worker()
const result = await instance.add(2, 3)

result === 5
```

With serviceWorker (note that this might be buggy!):

```ts
// worker.ts
export const add = (a: number, b: number) => a + b

// main.ts
import add_worker from 'comlink-sw:./worker'

// Create Worker
const instance = add_worker()
// access methods / values from instance.cl This makes change of the serviceWorker while on the page posible - (but internal state might change!)
const result = await instance.cl.add(2, 3)

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
       * Filename of type file
       * Set to a filename (releative to root) if you want to have
       * auto generated type files for your imports.
       * HIGHLY RECOMENDED WHEN USEING TYPESCRIPT!
       * @default false
       */
      typeFile: "comlink-workers.d.ts",
    })
  ],
}
```


## Types
See https://github.com/GoogleChromeLabs/comlink#typescript for some drawbacks / limitations of typescript.

If you enable types, a `.d.ts` file is generated at runtime that types your imports! This makes typescript realy simple. Ensure that typescript includes the `.d.ts` file.

## Module Worker
Not all Browsers support module Workers (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules).
This results in some Drawbacks for fastest and best support:

For fast development we use module Workers as bundleling the complete worker on the fly is not performant.

In default settings we bundle the whole worker at build to a single file. Therefor all browsers that supports Workers work in production. 
You can set the option `moduleWorker` to `true` to also use module worker in production. But that is (currently) not recomended. 

> Note: When Firefox (in development) and Safari (supports it in TP) have shiped the feature the default of `moduleWorker` will probably change to `true`. This will be a breaking change and come with a major version bump.

### What this means:

1. In development you need a browser that supports module Worker (see https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)
2. In production (unless setting `moduleWorker` to `true`) all browsers are supported

### Change that (add dev-support for FireFox, IE, ...)
If you don't want this behavior you can use the `customConfigs` and overwrite the default with a custom setting (here `worker-iife:`).

```ts
{
  plugins: [
    comlink({
      customConfigs: {
        "comlink:": "comlink@main:worker-iife:comlink@worker:",
      }
    })
  ]
}
```

## HMR
I currently work on an implementation on this. (Hope to release this with 2.1 or 2.2)

## Breaking changes
### v2.0
I rewrote most of the plugin to use my own custom worker implementation. This makes the code much more easy to maintain and understand. And you can even add some custom worker config that you can configure.



## Ressources
https://github.com/GoogleChromeLabs/comlink  
https://github.com/surma/rollup-plugin-comlink
