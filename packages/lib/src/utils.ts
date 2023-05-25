import {
  autometrics,
  AutometricsClassDecoratorOptions,
  AutometricsOptions,
} from "./wrappers";

/**
 * Decorator factory that returns a method decorator. Optionally accepts
 * an autometrics options object.
 * @param autometricsOptions
 */
export function getAutometricsMethodDecorator(
  autometricsOptions?: AutometricsOptions,
) {
  return function (
    _target: Object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalFunction = descriptor.value;
    const functionOrOptions = autometricsOptions ?? originalFunction;
    const functionInput = autometricsOptions ? originalFunction : undefined;

    descriptor.value = autometrics(functionOrOptions, functionInput);

    return descriptor;
  };
}

/**
 * Decorator factory that returns a class decorator that instruments all methods
 * of a class with autometrics. Optionally accepts an autometrics options
 * object.
 * @param autometricsOptions
 */
export function getAutometricsClassDecorator(
  autometricsOptions?: AutometricsClassDecoratorOptions,
): ClassDecorator {
  return function (classConstructor: Function) {
    const prototype = classConstructor.prototype;
    const propertyNames = Object.getOwnPropertyNames(prototype);
    const methodDecorator = getAutometricsMethodDecorator(autometricsOptions);

    for (const propertyName of propertyNames) {
      const property = prototype[propertyName];
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        propertyName,
      );

      if (
        typeof property !== "function" ||
        propertyName === "constructor" ||
        !descriptor
      ) {
        continue;
      }

      const instrumentedDescriptor = methodDecorator(
        {},
        propertyName,
        descriptor,
      );

      Object.defineProperty(prototype, propertyName, instrumentedDescriptor);
    }
  };
}

export type Runtime = "node" | "deno" | "browser" | "unknown";

export function getRuntime(): Runtime {
  if (typeof process === "object" && "cwd" in process) {
    return "node";
    //@ts-ignore
  } else if (typeof Deno === "object") {
    return "deno";
  } else if (typeof window === "object") {
    return "browser";
  } else {
    return "unknown";
  }
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

  // We split away everything up to the root directory of the project
  let modulePath = fullPath.replace(rootDir, "");

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
