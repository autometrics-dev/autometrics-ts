import "./instrumentation";
import { Attributes } from "@opentelemetry/api";
import type { Objective } from "./objectives";
import { getMeter } from "./instrumentation";
import { AsyncLocalStorage } from "async_hooks";

type ALSContext = {
  caller?: string;
}

const context = new AsyncLocalStorage<ALSContext>();

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

// rome-ignore lint/suspicious/noEmptyInterface: Converting this to a type breaks the language server plugin
interface AutometricsWrapper<T extends AnyFunction<T>> extends AnyFunction<T> {}

export type AutometricsOptions = {
  /**
   * Name of your function
   */
  functionName?: string;
  /**
   * Name of the module (usually filename)
   */
  moduleName?: string;
  /**
   * Include this function's metrics in the specified objective or SLO.
   *
   * See the docs for {@link Objective} for details on how to create objectives.
   */
  objective?: Objective;
  /**
   * Pass this argument to track the number of concurrent calls to the function (using a gauge).
   * This may be most useful for top-level functions such as the main HTTP handler that
   * passes requests off to other functions. (default: `false`)
   */
  trackConcurrency?: boolean;
};

/**
 * Autometrics wrapper for **functions** that automatically instruments the
 * wrapped function with OpenTelemetry-compatible metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if
 * you have the language service plugin installed)
 *
 * @param functionOrOptions {(F|AutometricsOptions)} - the function that will be wrapped and instrumented
 * (requests handler or database method)
 * @param fnInput {F}
 */
export function autometrics<F extends FunctionSig>(
  functionOrOptions: F | AutometricsOptions,
  fnInput?: F,
): AutometricsWrapper<F> {
  let functionName: string;
  let moduleName: string;
  let fn: F;
  let objective: Objective | undefined;
  let trackConcurrency = false;

  if (typeof functionOrOptions === "function") {
    fn = functionOrOptions;
    functionName = fn.name;
    moduleName = getModulePath();
  } else {
    fn = fnInput;
    functionName =
      "functionName" in functionOrOptions
        ? functionOrOptions.functionName
        : fn.name;

    moduleName =
      "moduleName" in functionOrOptions
        ? functionOrOptions.moduleName
        : getModulePath();

    if ("objective" in functionOrOptions) {
      objective = functionOrOptions.objective;
    }

    if ("trackConcurrency" in functionOrOptions) {
      trackConcurrency = functionOrOptions.trackConcurrency;
    }
  }

  if (!functionName) {
    console.trace("Autometrics decorated function must have a name to successfully create metrics. This function will not be instrumented.")
  }

  const counterObjectiveAttributes: Attributes = {};
  const histogramObjectiveAttributes: Attributes = {};

  if (objective) {
    const { latency, name, successRate } = objective;

    counterObjectiveAttributes.objective_name = name;
    histogramObjectiveAttributes.objective_name = name;

    if (latency) {
      const [threshold, latencyPercentile] = latency;
      histogramObjectiveAttributes.objective_latency_threshold = threshold;
      histogramObjectiveAttributes.objective_percentile = latencyPercentile;
    }

    if (successRate) {
      counterObjectiveAttributes.objective_percentile = successRate;
    }
  }

  return function(...params) {
    const meter = getMeter();
    const autometricsStart = performance.now();
    const counter = meter.createCounter("function.calls.count");
    const histogram = meter.createHistogram("function.calls.duration");
    const gauge = meter.createUpDownCounter("function.calls.concurrent");
    const store = context.getStore();
    const caller = store?.caller;

    if (trackConcurrency) {
      gauge.add(1, {
        function: functionName,
        module: moduleName,
      });
    }

    const onSuccess = () => {
      const autometricsDuration = performance.now() - autometricsStart;

      counter.add(1, {
        function: functionName,
        module: moduleName,
        result: "ok",
        caller,
        ...counterObjectiveAttributes,
      });

      histogram.record(autometricsDuration, {
        function: functionName,
        module: moduleName,
        caller,
        ...histogramObjectiveAttributes,
      });

      if (trackConcurrency) {
        gauge.add(-1, {
          function: functionName,
          module: moduleName,
        });
      }
    };

    const onError = () => {
      const autometricsDuration = performance.now() - autometricsStart;

      counter.add(1, {
        function: functionName,
        module: moduleName,
        result: "error",
        caller,
        ...counterObjectiveAttributes,
      });

      histogram.record(autometricsDuration, {
        function: functionName,
        module: moduleName,
        caller,
        ...histogramObjectiveAttributes,
      });

      if (trackConcurrency) {
        gauge.add(-1, {
          function: functionName,
          module: moduleName,
          caller,
        });
      }
    };

    return context.run({ caller: functionName }, () => {
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
    });

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
  Error.stackTraceLimit = 5;
  const stack = new Error()?.stack?.split("\n");

  let rootDir: string;

  if (typeof process === "object") {
    // HACK: this assumes the entire app was run from the root directory of the project
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
