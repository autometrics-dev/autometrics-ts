import "./instrumentation";
import { getMeter } from "./instrumentation";

/**
 * Autometrics decorator for **class methods** that automatically instruments the decorated method with OpenTelemetry-compatible metrics.
 *
 * Hover over the method to get the links for generated queries (if you have the language service plugin installed)
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
// rome-ignore lint/suspicious/noExplicitAny: this seems to be the preferred way for defining functions in typescript
type FunctionSig = (...args: any[]) => any;

type AnyFunction<T extends FunctionSig> = (
  ...params: Parameters<T>
) => ReturnType<T>;

/**
 * This type signals to the language service plugin that it should show extra documentation along with the queries.
 */
interface AutometricsWrapper<T extends AnyFunction<T>> extends AnyFunction<T> {}

/**
 * Autometrics wrapper for **functions** that automatically instruments the wrapped function with OpenTelemetry-compatible metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if you have the language service plugin installed)
 *
 * @param {AnyFunction} fn - the function that will be wrapped and instrumented (requests handler or database method)
 */
export function autometrics<F extends FunctionSig>(
  fn: F,
): AutometricsWrapper<F> {
  if (!fn.name) {
    throw new TypeError(
      "Autometrics decorated function must have a name to succesfully create a metric",
    );
  }

  const module = getModulePath();

  return function (...params) {
    const meter = getMeter();
    const autometricsStart = performance.now();
    const counter = meter.createCounter("function.calls.count");
    const histogram = meter.createHistogram("function.calls.duration");

    const onSuccess = () => {
      const autometricsDuration = performance.now() - autometricsStart;
      counter.add(1, { module, function: fn.name, result: "ok" });
      histogram.record(autometricsDuration, { function: fn.name });
    };

    const onError = () => {
      const autometricsDuration = performance.now() - autometricsStart;
      counter.add(1, { module, function: fn.name, result: "error" });
      histogram.record(autometricsDuration, { function: fn.name });
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
  const rootDir = process.cwd(); // HACK: this assumes the entire app was run from the root directory of the project

  if (!stack) {
    return undefined;
  }

  /**
   *
   * 0: Error
   * 1: at getModulePath() ...
   * 2: at autometrics() ...
   * 3: at ... -> 4th line is always the original caller
   */
  const originalCaller = 3 as const;
  const fullPath = stack[originalCaller].split(" ").pop(); // the last element in this array will have the full path

  let modulePath = fullPath.split(rootDir).pop(); // we split away everything up to the root directory of the project
  modulePath = modulePath.substring(0, modulePath.indexOf(":")); // we split away the line and column numbers index.js:14:6

  return modulePath;
}
