// typescript-eslint does not support TypeScript 7 yet, so while linting, "typescript" resolves to the TS 6 package instead.
const Module = require("node:module");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return original.call(this, request === "typescript" ? "@typescript/typescript6" : request, ...rest);
};
