import { wrap as comlink_wrap } from "comlink";
export {
    proxy,
    proxyMarker,
    finalizer,
    releaseProxy,
    createEndpoint
} from 'comlink'
export const endpointSymbol = Symbol("getEndpoint");

/**
 * internal API
 */
export const wrap: typeof comlink_wrap = (ep) => {
    const wrapped = comlink_wrap(ep);
    return new Proxy(wrapped, {
      get(target, prop, receiver) {
        if (prop === endpointSymbol) return ep;
        return Reflect.get(target, prop, receiver);
      }
    }) as any;
}