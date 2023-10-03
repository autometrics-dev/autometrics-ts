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
  let wrappedFunctionPath: string | undefined;

  if ("prepareStackTrace" in Error) {
    const defaultPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const { stack: stackConstructor } = new Error() as Error & {
      stack: NodeJS.CallSite[];
    };
    Error.prepareStackTrace = defaultPrepareStackTrace; // we have to make sure to reset this to normal

    const stack = stackConstructor.map((callSite) => ({
      name: callSite.getFunctionName(),
      file: callSite.getFileName(),
    }));

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
    wrappedFunctionPath =
      stack.find((call) => {
        if (call.name?.includes("__decorate")) return true;
      })?.file ?? stack[2]?.file;
  } else {
    const stack = new Error().stack?.split("\n");
    wrappedFunctionPath = stack?.[3]
      ?.split(" ")
      .filter((el) => el.length !== 0)
      .pop(); // last item of the array is the path
  }

  let rootDir: string;
  const runtime = getRuntime();
  if (runtime === "browser") {
    rootDir = "";
    //@ts-ignore
  } else if (runtime === "deno" && typeof Deno?.cwd === "function") {
    try {
      // HACK - Deno Deploy does not necessarily have access to `Deno.cwd`, so we need to handle this case
      //        Note that in such an event, `Deno.cwd` will still be defined as a function,
      //        but it will throw an error when invoked
      //@ts-ignore
      rootDir = Deno.cwd();
    } catch (_) {
      rootDir = "";
    }
  } else if (runtime === "node" && typeof process?.cwd === "function") {
    // HACK: this assumes the entire app was run from the root directory of the
    // project
    try {
      rootDir = process.cwd();
    } catch (_) {
      rootDir = "";
    }
  } else {
    rootDir = "";
  }

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

  wrappedFunctionPath = wrappedFunctionPath?.replace(rootDir, "");

  return wrappedFunctionPath;
}

type ALSContext = {
  caller?: string;
};

export type ALSInstance = Awaited<ReturnType<typeof getALSInstance>>;

export async function getALSInstance() {
  try {
    const { AsyncLocalStorage } = await import("node:async_hooks");
    return new AsyncLocalStorage<ALSContext>();
  } catch (_) {
    return undefined;
  }
}

export function getALSCaller(context?: ALSInstance) {
  if (context) {
    const contextValue = context.getStore();
    return contextValue?.caller;
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
