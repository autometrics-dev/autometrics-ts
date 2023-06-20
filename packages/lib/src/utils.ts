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
  Error.stackTraceLimit = 5;
  const stack = new Error()?.stack?.split("\n");

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
   *
   * 0: Error
   * 1: at getModulePath() ...
   * 2: at autometrics() ...
   * 3: at ... -> 4th line is always the original caller
   */
  const originalCaller = 3 as const;

  // The last element in this array will have the full path
  const fullPath = stack[originalCaller].split(" ").pop();

  const containsFileProtocol = fullPath?.includes("file://");

  // We split away everything up to the root directory of the project,
  // if the path contains file:// we need to remove it
  let modulePath = fullPath.replace(
    containsFileProtocol ? `file://${rootDir}` : rootDir,
    "",
  );

  // We split away the line and column numbers index.js:14:6
  modulePath = modulePath.substring(0, modulePath.indexOf(":"));

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
