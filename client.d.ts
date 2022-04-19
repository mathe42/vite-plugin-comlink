import type { Remote } from 'comlink'

declare global {
    var ComlinkWorker: {
        new<T = any>(scriptURL: URL, options?: ComlinkWorkerOptions): Remote<T>;
    };

    var ComlinkSharedWorker: {
        new<T = any>(scriptURL: URL, options?: ComlinkWorkerOptions): Remote<T>;
    };

    interface ComlinkWorkerOptions extends WorkerOptions {
        replacement?: string
    }
}