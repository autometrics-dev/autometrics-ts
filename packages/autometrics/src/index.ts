import otel from "@opentelemetry/api";

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
  const meter = otel.metrics.getMeter("autometrics-prometheus");
  const originalFunction = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    let result: ReturnType<typeof originalFunction>;
    const autometricsStart = new Date().getTime();
    const counter = meter.createCounter("method.calls.count");
    const histogram = meter.createHistogram("method.calls.duration");

    const onSuccess = () => {
      counter.add(1, { method: propertyKey, result: "ok" });
      const autometricsDuration = new Date().getTime() - autometricsStart;
      histogram.record(autometricsDuration, { method: propertyKey });
    };

    const onError = () => {
      const autometricsDuration = new Date().getTime() - autometricsStart;
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

interface AutometricsWrapper<T extends AnyFunction<T>> extends AnyFunction<T> {}

/**
 * Autometrics wrapper for **functions** that automatically instruments the wrapped function with OpenTelemetry-compatible metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if you have the language service plugin installed)
 * @param - the function that will be wrapped and instrumented
 */
export function autometrics<F extends FunctionSig>(
  fn: F,
): AutometricsWrapper<F> {
  const meter = otel.metrics.getMeter("autometrics-prometheus");

  if (!fn.name) {
    throw new TypeError(
      "Autometrics decorated function must have a name to succesfully create a metric",
    );
  }

  return function (...params) {
    const autometricsStart = new Date().getTime();
    const counter = meter.createCounter("function.calls.count");
    const histogram = meter.createHistogram("function.calls.duration");

    const onSuccess = () => {
      counter.add(1, { function: fn.name, result: "ok" });
      const autometricsDuration = new Date().getTime() - autometricsStart;
      histogram.record(autometricsDuration, { function: fn.name });
    };

    const onError = () => {
      const autometricsDuration = new Date().getTime() - autometricsStart;
      counter.add(1, { function: fn.name, result: "error" });
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
