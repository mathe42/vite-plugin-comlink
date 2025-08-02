import { wrap as comlink_wrap } from "comlink";

// Re-export commonly used Comlink utilities for convenience
export {
    proxy,
    proxyMarker,
    finalizer,
    releaseProxy,
    createEndpoint
} from 'comlink'

/**
 * Symbol used to access the underlying Worker/SharedWorker instance
 * from a Comlink-wrapped worker proxy.
 * 
 * Usage:
 * ```ts
 * const worker = new ComlinkWorker<typeof import('./worker')>(
 *   new URL('./worker', import.meta.url)
 * );
 * const nativeWorker = worker[endpointSymbol]; // Access underlying Worker
 * ```
 */
export const endpointSymbol = Symbol("getEndpoint");

/**
 * Enhanced wrap function that extends Comlink's wrap with endpoint access.
 * 
 * This function wraps a Worker/SharedWorker endpoint with Comlink's proxy,
 * but also adds the ability to access the original endpoint via a symbol.
 * This allows users to access native Worker methods and properties when needed.
 * 
 * @param ep - The endpoint (Worker, SharedWorker.port, MessagePort, etc.) to wrap
 * @returns Comlink proxy with additional endpoint access via endpointSymbol
 * 
 * @internal This is used internally by the plugin transformation
 */
export const wrap: typeof comlink_wrap = (ep) => {
    // Create the standard Comlink proxy
    const wrapped = comlink_wrap(ep);
    
    // Enhance the proxy to expose the underlying endpoint via symbol
    return new Proxy(wrapped, {
      get(target, prop, receiver) {
        // If accessing the endpoint symbol, return the original endpoint
        if (prop === endpointSymbol) return ep;
        
        // Otherwise, delegate to the wrapped Comlink proxy
        return Reflect.get(target, prop, receiver);
      }
    }) as any;
}