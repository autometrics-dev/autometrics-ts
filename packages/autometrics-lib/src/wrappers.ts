import "./instrumentation";
import { Attributes } from "@opentelemetry/api";
import type { Objective } from "./objectives";
import { getMeter } from "./instrumentation";

/**
 * Autometrics decorator for **class methods** that automatically instruments
 * the decorated method with OpenTelemetry-compatible metrics.
 *
 * Hover over the method to get the links for generated queries (if you have the
 * language service plugin installed)
 */
export function autometricsDecorator(autometricsOptions?: AutometricsOptions) {
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

// TODO: write JSdoc
export function autometricsClassDecorator(
  autometricsOptions?: Omit<AutometricsOptions, "functionName">,
) {
  return function (classConstructor: Function) {
    const prototype = classConstructor.prototype;
    const properties = Object.getOwnPropertyNames(prototype);

    for (const key of properties) {
      const property = prototype[key];

      if (typeof property === "function" && key !== "constructor") {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);

        if (descriptor) {
          const instrumentedDescriptor = autometricsDecorator(
            autometricsOptions,
          )({}, key, descriptor);

          Object.defineProperty(prototype, key, instrumentedDescriptor);
        }
      }
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
    throw new Error(
      "Autometrics decorated function must have a name to successfully create a metric",
    );
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

  return function (...params) {
    const meter = getMeter();
    const autometricsStart = performance.now();
    const counter = meter.createCounter("function.calls.count");
    const histogram = meter.createHistogram("function.calls.duration");
    const gauge = meter.createUpDownCounter("function.calls.concurrent");

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
        ...counterObjectiveAttributes,
      });

      histogram.record(autometricsDuration, {
        function: functionName,
        module: moduleName,
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
        ...counterObjectiveAttributes,
      });

      histogram.record(autometricsDuration, {
        function: functionName,
        module: moduleName,
        ...histogramObjectiveAttributes,
      });

      if (trackConcurrency) {
        gauge.add(-1, {
          function: functionName,
          module: moduleName,
        });
      }
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
