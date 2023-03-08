import startTSPlugin from "@autometrics/typescript-plugin";

// the TypeScript plugin must be the default entry point for the library
// and it has to be a CommonJS export
module.exports = startTSPlugin;
exports = module.exports;

// Other library APIs are exported as default
export * from "@autometrics/autometrics";

