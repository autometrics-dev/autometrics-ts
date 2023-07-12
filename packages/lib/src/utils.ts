export type Runtime = "node" | "deno" | "browser" | "unknown";

export function getRuntime(): Runtime {
  if (typeof process === "object" && "cwd" in process) {
    return "node";
  }

  //@ts-ignore
  if (typeof Deno === "object") {
    return "deno";
  }

  if (typeof window === "object") {
    return "browser";
  }

  return "unknown";
}

// HACK: this entire function is a hacky way to acquire the module name for a
// given function e.g.: dist/index.js
export function getModulePath(): string | undefined {
  const defaultPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (error, stack) => stack;
  // @ts-ignore: TS doesn't recognize that we've overwritten
  // the default "stack" property
  const { stack: stackConstructor }: { stack: NodeJS.CallSite[] } = new Error();
  Error.prepareStackTrace = defaultPrepareStackTrace; // we have to make sure to reset this to normal

  const stack = stackConstructor.map((callSite) => ({
    name: callSite.getFunctionName(),
    file: callSite.getFileName(),
  }));

  let rootDir: string;
  const runtime = getRuntime();
  if (runtime === "browser") {
    rootDir = "";
  } else if (runtime === "deno") {
    //@ts-ignore
    rootDir = Deno.cwd();
  } else if (runtime === "node") {
    // HACK: this assumes the entire app was run from the root directory of the
    // project
    rootDir = process.cwd();
  } else {
    rootDir = "";
  }

  if (!stack) {
    return;
  }

  /**
   * Finds the original wrapped function, first it checks if it's a decorator,
   * and returns that filename or gets the 3th item of the stack trace:
   *
   * 0: Error
   * 1: at getModulePath ...
   * 2: at autometrics ...
   * 3: at ... -> 4th line is always the original wrapped function
   */
  const wrappedFunctionPath =
    stack.find((call) => {
      if (call.name === "__decorateClass") return true;
    })?.file ?? stack[2]?.file;

  const containsFileProtocol = wrappedFunctionPath.includes("file://");

  // We split away everything up to the root directory of the project,
  // if the path contains file:// we need to remove it
  const modulePath = wrappedFunctionPath.replace(
    containsFileProtocol ? `file://${rootDir}` : rootDir,
    "",
  );

  return modulePath;
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

export function isPromise<T extends Promise<void>>(val: unknown): val is T {
  return (
    typeof val === "object" &&
    "then" in val &&
    typeof val.then === "function" &&
    "catch" in val &&
    typeof val.catch === "function"
  );
}

export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

export function isObject(value: unknown): value is Object {
  return typeof value === "object";
}
