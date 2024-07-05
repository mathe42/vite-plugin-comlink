const { wrap: comlink_wrap } = require("comlink");
const comlink = {
    proxy,
    proxyMarker,
    finalizer,
    releaseProxy,
    createEndpoint
} = require('comlink');

Object.assign(module.exports, comlink);

const endpointSymbol = module.exports.endpointSymbol = Symbol("getEndpoint");

/**
 * internal API
 */
module.exports.wrap = (ep) => {
    const wrapped = comlink_wrap(ep);
    return new Proxy(wrapped, {
      get(_target, prop, _receiver) {
        if (prop === endpointSymbol) return ep;
        return Reflect.get(...arguments);
      }
    });
}