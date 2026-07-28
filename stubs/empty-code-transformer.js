// Stub for @apm-js-collab/code-transformer on Cloudflare Workers.
// That package ships inline WASM used only for Node Module._compile hooks;
// Workers forbid WebAssembly.compile() from buffers, which floods Sentry.
module.exports.create = function create() {
  return {
    getTransformer() {
      return undefined;
    },
  };
};
