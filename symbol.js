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
export const wrap = (ep) => {
    const wrapped = comlink_wrap(ep);
    return new Proxy(wrapped, {
      get(_target, prop, _receiver) {
        if (prop === endpointSymbol) return ep;
        return Reflect.get(...arguments);
      }
    });
}