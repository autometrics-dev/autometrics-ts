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

type ALSContext = {
  caller?: string;
};

export type ALSInstance = Awaited<ReturnType<typeof getALSInstance>>;

export async function getALSInstance() {
  const { AsyncLocalStorage } = await import("node:async_hooks");
  return new AsyncLocalStorage<ALSContext>();
}

export function getALSCaller(context?: ALSInstance) {
  if (context) {
    const contextValue = context.getStore();
    return contextValue?.caller;
  }
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

    // Finds the original wrapped function, first it checks if it's a decorator,
    // and returns that filename or gets the 3th item of the stack trace:
    //
    // 0: Error
    // 1: at getWrappedFunctionPath ...
    // 2: at getModulePath ...
    // 3: at autometrics ...
    // 4: at ... -> 5th line is always the original wrapped function
    return (
      stack.find((call) => call.name?.includes("__decorate"))?.file ??
        stack[3]?.file
    );
  } else {
    const stack = new Error().stack?.split("\n");
    return stack?.[4]
      ?.split(" ")
      .filter((el) => el.length !== 0)
      .pop(); // last item of the array is the path
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
