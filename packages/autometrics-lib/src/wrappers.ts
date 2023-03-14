import "./instrumentation";
import { getMeter } from "./instrumentation";

/**
 * Autometrics decorator for **class methods** that automatically instruments
 * the decorated method with OpenTelemetry-compatible metrics.
 *
 * Hover over the method to get the links for generated queries (if you have the
 * language service plugin installed)
 */
export function autometricsDecorator(
  _target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalFunction = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    const meter = getMeter();
    let result: ReturnType<typeof originalFunction>;
    const autometricsStart = performance.now();
    const counter = meter.createCounter("method.calls.count");
    const histogram = meter.createHistogram("method.calls.duration");

    const onSuccess = () => {
      counter.add(1, { method: propertyKey, result: "ok" });
      const autometricsDuration = performance.now() - autometricsStart;
      histogram.record(autometricsDuration, { method: propertyKey });
    };

    const onError = () => {
      const autometricsDuration = performance.now() - autometricsStart;
      counter.add(1, { method: propertyKey, result: "error" });
      histogram.record(autometricsDuration, { method: propertyKey });
    };

    try {
      originalFunction.apply(this, args);
      onSuccess();
      return result;
    } catch (error) {
      onError();
      throw error;
    }
  };
}

// Function Wrapper
// This seems to be the preferred way for defining functions in TypeScript
// rome-ignore lint/suspicious/noExplicitAny:
type FunctionSig = (...args: any[]) => any;

type AnyFunction<T extends FunctionSig> = (
  ...params: Parameters<T>
) => ReturnType<T>;

/**
 * This type signals to the language service plugin that it should show extra
 * documentation along with the queries.
 */
interface AutometricsWrapper<T extends AnyFunction<T>> extends AnyFunction<T> {}

interface AutometricsOptions {
  functionName: string;
  moduleName: string | "MODULE";
}

/**
 * Autometrics wrapper for **functions** that automatically instruments the
 * wrapped function with OpenTelemetry-compatible metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if
 * you have the language service plugin installed)
 *
 * @param fnOrOptions {(F|AutometricsOptions)} - the function that will be wrapped and instrumented
 * (requests handler or database method)
 */
export function autometrics<F extends FunctionSig>(
  fnOrOptions: F | AutometricsOptions,
  fnInput?: F,
): AutometricsWrapper<F> {
  let functionName: string;
  let module: string;
  let fn: F;

  if ("functionName" in fnOrOptions) {
    fn = fnInput;
    functionName = fnOrOptions.functionName;
    module = fnOrOptions.moduleName;
  } else {
    fn = fnOrOptions;
    functionName = fn.name;
    module = getModulePath();
  }

  if (!functionName) {
    throw new TypeError(
      "Autometrics decorated function must have a name to succesfully create a metric",
    );
  }

  return function (...params) {
    const meter = getMeter();
    const autometricsStart = performance.now();
    const counter = meter.createCounter("function.calls.count");
    const histogram = meter.createHistogram("function.calls.duration");

    const onSuccess = () => {
      const autometricsDuration = performance.now() - autometricsStart;
      counter.add(1, { module, function: functionName, result: "ok" });
      histogram.record(autometricsDuration, { function: functionName });
    };

    const onError = () => {
      const autometricsDuration = performance.now() - autometricsStart;
      counter.add(1, { module, function: functionName, result: "error" });
      histogram.record(autometricsDuration, { function: functionName });
    };

    try {
      const result = fn(...params);
      if (isPromise<ReturnType<F>>(result)) {
        return result
          .then((res: Awaited<ReturnType<typeof result>>) => {
            onSuccess();
            return res;
          })
          .catch((err: unknown) => {
            onError();
            throw err;
          });
      }

      onSuccess();
      return result;
    } catch (error) {
      onError();
      throw error;
    }
  };
}

function isPromise<T extends Promise<void>>(val: unknown): val is T {
  return (
    typeof val === "object" &&
    "then" in val &&
    typeof val.then === "function" &&
    "catch" in val &&
    typeof val.catch === "function"
  );
}

// HACK: this entire function is a hacky way to acquire the module name
// for a given function e.g.: dist/index.js
function getModulePath(): string | undefined {
  const stack = new Error()?.stack?.split("\n");
  // HACK: this assumes the entire app was run from the root directory of the project
  const rootDir = process.cwd();

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
  let modulePath = fullPath.split(rootDir).pop();

  // We split away the line and column numbers index.js:14:6
  modulePath = modulePath.substring(0, modulePath.indexOf(":"));

  return modulePath;
}
