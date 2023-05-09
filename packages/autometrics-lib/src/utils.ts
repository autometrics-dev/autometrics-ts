import { autometrics, AutometricsOptions } from "./wrappers";

export function getAutometricsMethodDecorator(
  autometricsOptions?: AutometricsOptions,
) {
  return function (
    _target: Object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalFunction = descriptor.value;
    descriptor.value = autometrics(autometricsOptions, originalFunction);

    return descriptor;
  };
}

export function getAutometricsClassDecorator(
  autometricsOptions?: AutometricsOptions,
) {
  return function (classConstructor: Function) {
    const prototype = classConstructor.prototype;
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (const propertyName of propertyNames) {
      const property = prototype[propertyName];

      if (typeof property !== "function" || propertyName === "constructor") {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        propertyName,
      );
      if (!descriptor) {
        continue;
      }

      const methodDecorator = getAutometricsMethodDecorator(autometricsOptions);
      const instrumentedDescriptor = methodDecorator(
        {},
        propertyName,
        descriptor,
      );

      Object.defineProperty(prototype, propertyName, instrumentedDescriptor);
    }
  };
}

// HACK: this entire function is a hacky way to acquire the module name for a
// given function e.g.: dist/index.js
export function getModulePath(): string | undefined {
  Error.stackTraceLimit = 5;
  const stack = new Error()?.stack?.split("\n");

  let rootDir: string;

  if (typeof process === "object") {
    // HACK: this assumes the entire app was run from the root directory of the
    // project
    rootDir = process.cwd();
    //@ts-ignore
  } else if (typeof Deno === "object") {
    //@ts-ignore
    rootDir = Deno.cwd();
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
