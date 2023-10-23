import { getCwd } from "./platform.deno.ts";

// HACK: this entire function is a hacky way to acquire the module name for a
// given function e.g.: dist/index.js
export function getModulePath(): string | undefined {
  let wrappedFunctionPath = getWrappedFunctionPath();

  // check if the string is wrapped in parenthesis, if so, remove them
  if (wrappedFunctionPath?.startsWith("(")) {
    wrappedFunctionPath = wrappedFunctionPath.slice(1, -1);
  }

  // If the path contains file:// protocol we need to remove it
  if (wrappedFunctionPath?.includes("file://")) {
    wrappedFunctionPath = wrappedFunctionPath.replace("file://", "");
  }

  // if the path contains the column/line number we need to remove it

  if (wrappedFunctionPath?.includes(":")) {
    wrappedFunctionPath = wrappedFunctionPath.slice(
      0,
      wrappedFunctionPath.indexOf(":"),
    );
  }

  wrappedFunctionPath = wrappedFunctionPath?.replace(getCwd(), "");

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

    if (!stack) {
      return;
    }

    // First checks if it is a TypeScript legacy decorator, and returns the
    // file path in which the decorator is defined if it is. Otherwise it
    // returns the first file path from the 4th call in the stack trace which
    // does not point to our `wrappers.ts`.
    //
    // 0: getWrappedFunctionPath
    // 1: getModulePath
    // 2: autometrics
    // 3: ... -> 4th call is the original wrapped function, but may be wrapped
    //           by a decorator still.

    const call =
      stack.find((call) => call.name?.includes("__decorate")) ??
      stack
        .slice(3)
        .find(
          (call) =>
            call.file &&
            !call.file.includes("wrappers.ts") &&
            !call.file.includes("wrappers.js"),
        );
    return call?.file;
  } else {
    // First checks if it is a TypeScript legacy decorator, and returns the
    // file path in which the decorator is defined if it is. Otherwise it
    // returns the first file path from the 5th line in the stack trace which
    // does not point to our `wrappers.ts`.
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
    const line =
      lines.find((line) => line.startsWith("at __decorate ")) ??
      lines
        .slice(4)
        .find(
          (line) =>
            !line.includes("wrappers.ts") && !line.includes("wrappers.js"),
        );

    // Last space-separated item on the line is the path.
    const path = line?.trim().split(" ").pop();

    // Optionally strip surrounding braces before returning the path.
    return path?.startsWith("(") && path.endsWith(")")
      ? path.slice(1, path.length - 1)
      : path;
  }
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
