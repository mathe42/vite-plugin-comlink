import type { Remote } from 'comlink'
import { endpointSymbol as sym } from "./dist/symbol";

declare global {
    var ComlinkWorker: {
        new<T = any>(scriptURL: URL, options?: ComlinkWorkerOptions): { readonly [sym]: Worker } & Remote<T>;
    };

    var ComlinkSharedWorker: {
        new<T = any>(scriptURL: URL, options?: ComlinkWorkerOptions): { readonly [sym]: SharedWorker } & Remote<T>;
    };

    interface ComlinkWorkerOptions extends WorkerOptions {
        replacement?: string
    }
}
