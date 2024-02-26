import { getCwd } from "./platform.deno.ts";

/**
 * Function Wrapper
 * This seems to be the preferred way for defining functions in TypeScript
 */
// biome-ignore lint/suspicious/noExplicitAny:
export type FunctionSig = (...args: any[]) => any;

/**
 * Attempts to auto-detect the repository provider if none is specified, but we
 * do know the repository URL.
 */
export function detectRepositoryProvider(
  repositoryUrl: string | undefined,
): string | undefined {
  if (!repositoryUrl) {
    return;
  }

  if (repositoryUrl.includes("github.com")) {
    return "github";
  }

  if (repositoryUrl.includes("gitlab.com")) {
    return "gitlab";
  }

  if (repositoryUrl.includes("bitbucket.org")) {
    return "bitbucket";
  }
}

// HACK: this entire function is a hacky way to acquire the module name for a
// given function e.g.: dist/index.js
export function getModulePath(): string | undefined {
  let wrappedFunctionPath = getWrappedFunctionPath();
  if (!wrappedFunctionPath) {
    return;
  }

  // check if the string is wrapped in parenthesis, if so, remove them
  if (wrappedFunctionPath.startsWith("(")) {
    wrappedFunctionPath = wrappedFunctionPath.slice(1, -1);
  }

  // If the path starts with file:// protocol we need to remove it
  if (wrappedFunctionPath.startsWith("file://")) {
    wrappedFunctionPath = wrappedFunctionPath.slice(7);
  }

  // If the path contains the column/line number we need to remove it
  const colonIndex = wrappedFunctionPath.indexOf(":");
  if (colonIndex > -1) {
    wrappedFunctionPath = wrappedFunctionPath.slice(0, colonIndex);
  }

  const cwd = getCwd();
  if (wrappedFunctionPath.startsWith(cwd)) {
    wrappedFunctionPath = wrappedFunctionPath.slice(cwd.length);
  }

  return wrappedFunctionPath;
}

function getWrappedFunctionPath(): string | undefined {
  if ("prepareStackTrace" in Error) {
    const defaultPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_: Error, stack: Array<NodeJS.CallSite>) =>
      stack;
    const { stack: stackConstructor } = new Error() as Error & {
      stack: Array<NodeJS.CallSite>;
    };
    Error.prepareStackTrace = defaultPrepareStackTrace; // we have to make sure to reset this to normal

    const stack = stackConstructor.map((callSite) => ({
      name: callSite.getFunctionName(),
      file: callSite.getFileName(),
    }));

    // Returns the first file path from the 4th call in the stack trace which
    // does not point to Autometrics itself.
    //
    // 0: getWrappedFunctionPath
    // 1: getModulePath
    // 2: autometrics
    // 3: ... -> 4th call is the original wrapped function, but may be wrapped
    //           by a decorator still.

    const call = stack.find((call, index) => {
      const { file } = call;
      return (
        index > 2 &&
        file &&
        // Ignore autometrics internals
        !file.includes("autometrics/index.cjs") &&
        !file.includes("autometrics/index.mjs") &&
        !file.includes("wrappers.ts") &&
        !file.includes("wrappers.js") &&
        // Ignore reflect-metadata - often used by IOC libraries for runtime dependency injection
        // Without this, instrumented functions will be attributed to this module rather than
        // the module the function truly belongs to
        !file.includes("reflect-metadata")
      );
    });
    return call?.file;
  }

  // Returns the first file path from the 5th line in the stack trace which
  // does not point to Autometrics itself.
  //
  // 0: Error
  // 1: at getWrappedFunctionPath ...
  // 2: at getModulePath ...
  // 3: at autometrics ...
  // 4: at ... -> 5th line is the original wrapped function, but may be
  //              wrapped by a decorator still.

  const { stack } = new Error();
  if (!stack) {
    return;
  }

  const lines = stack.split("\n");
  const line = lines.find(
    (line, index) =>
      index > 3 &&
      !line.includes("autometrics/index.cjs") &&
      !line.includes("autometrics/index.mjs") &&
      !line.includes("wrappers.ts") &&
      !line.includes("wrappers.js"),
  );

  // Last space-separated item on the line is the path.
  const path = line?.trim().split(" ").pop();

  // Optionally strip surrounding braces before returning the path.
  return path?.startsWith("(") && path.endsWith(")")
    ? path.slice(1, path.length - 1)
    : path;
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value != null &&
    "then" in value &&
    typeof value.then === "function" &&
    "catch" in value &&
    typeof value.catch === "function"
  );
}

export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

export function isObject(value: unknown): value is Object {
  return typeof value === "object";
}
