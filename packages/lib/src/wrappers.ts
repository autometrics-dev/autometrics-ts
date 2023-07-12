import { Attributes } from "@opentelemetry/api";
import type { Objective } from "./objectives";
import { getMeter } from "./instrumentation";
import {
  ALSInstance,
  getALSCaller,
  getALSInstance,
  getModulePath,
  isFunction,
  isObject,
  isPromise,
} from "./utils";
import { setBuildInfo } from "./buildInfo";

let asyncLocalStorage: ALSInstance | undefined;
if (typeof window === "undefined") {
  (async () => {
    asyncLocalStorage = await getALSInstance();
  })();
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
/* rome-ignore lint/suspicious/noEmptyInterface: Converting this to a type
breaks the language server plugin */
interface AutometricsWrapper<T extends AnyFunction<T>> extends AnyFunction<T> {}

export type AutometricsOptions = {
  /**
   * Name of your function. Only necessary if using the decorator/wrapper on the
   * client side where builds get minified.
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
   * Pass this argument to track the number of concurrent calls to the function
   * (using a gauge).
   * This may be most useful for top-level functions such as the main HTTP
   * handler that passes requests off to other functions. (default: `false`)
   */
  trackConcurrency?: boolean;
};

/**
 * Autometrics wrapper for **functions** (requests handlers or database methods)
 * that automatically instruments the wrapped function with OpenTelemetry metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if
 * you have the language service plugin installed)
 *
 * @param functionOrOptions {(F|AutometricsOptions)} - the function that will be
 * wrapped and instrumented with metrics, or an options object
 * @param fnInput {F} - the function that will be wrapped and instrumented with
 * metrics (only necessary if the first argument is an options object)
 *
 * @example
 *
 * <caption>Basic usage</caption>
 *
 * ```typescript
 * import { autometrics } from "autometrics";
 *
 * const createUser = autometrics(async function createUser(payload: User) {
 *   // ...
 * });
 *
 * const user = createUser();
 * ```
 *
 * <caption>Usage with options</caption>
 *
 * ```typescript
 * import {
 *   autometrics,
 *   AutometricsOptions,
 *   Objective,
 *   ObjectiveLatency,
 *   ObjectivePercentile,
 * } from "autometrics";
 *
 * const objective: Objective = {
 *   successRate: ObjectivePercentile.P99_9,
 *   latency: [ObjectiveLatency.Ms250, ObjectivePercentile.P99],
 *   name: "foo",
 * };
 *
 * const autometricsOptions: AutometricsOptions = {
 *   objective,
 *   trackConcurrency: true,
 * };
 *
 * const createUser = autometrics(autometricsOptions, async function createUser(payload: User) {
 *  // ...
 * });
 *
 * const user = createUser();
 * ```
 *
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
    console.trace(
      "Autometrics decorated function must have a name to successfully create a metric. Function will not be instrumented.",
    );
    return fn;
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
    setBuildInfo();
    const autometricsStart = performance.now();
    const counter = meter.createCounter("function.calls.count");
    const histogram = meter.createHistogram("function.calls.duration");
    const gauge = meter.createUpDownCounter("function.calls.concurrent");
    const caller = getALSCaller(asyncLocalStorage);

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

    function instrumentedFunction() {
      try {
        const result = fn.apply(this, params);
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
    }

    if (asyncLocalStorage) {
      return asyncLocalStorage.run(
        { caller: functionName },
        instrumentedFunction,
      );
    }

    return instrumentedFunction();
  };
}

export type AutometricsClassDecoratorOptions = Omit<
  AutometricsOptions,
  "functionName"
>;

type AutometricsDecoratorOptions<T> = T extends Function
  ? AutometricsClassDecoratorOptions
  : AutometricsOptions;

/**
 * Autometrics decorator that can be applied to either a class or class method
 * that automatically instruments methods with OpenTelemetry-compatible metrics.
 * Hover over the method to get the links for generated queries (if you have the
 * language service plugin installed).
 *
 * Optionally, you can pass in an {@link AutometricsOptions} object to configure
 * the decorator.
 * @param autometricsOptions
 *
 * @example
 *
 * <caption>Basic class decorator implementation</caption>
 *
 * ```
 *  \@Autometrics()
 *  class Foo {
 *   // Don't add a backslash in front of the decorator, this is only here to
 *   // prevent the example from rendering incorrectly
 *   bar() {
 *     console.log("bar");
 *   }
 * }
 * ```
 * @example
 *
 * <caption>Method decorator that passes in an autometrics options object including SLO</caption>
 *
 * ```typescript
 * import {
 *   Autometrics,
 *   AutometricsOptions,
 *   Objective,
 *   ObjectivePercentile,
 *   ObjectiveLatency,
 * } from "autometrics";
 *
 * const objective: Objective = {
 *   successRate: ObjectivePercentile.P99_9,
 *   latency: [ObjectiveLatency.Ms250, ObjectivePercentile.P99],
 *   name: "foo",
 * };
 *
 * const autometricsOptions: AutometricsOptions = {
 *   functionName: "FooBar",
 *   objective,
 *   trackConcurrency: true,
 * };
 *
 * class Foo {
 *   // Don't add a backslash in front of the decorator, this is only here to
 *   // prevent the example from rendering incorrectly
 *   \@Autometrics(autometricsOptions)
 *   bar() {
 *     console.log("bar");
 *   }
 * }
 * ```
 */
export function Autometrics<T extends Function | Object>(
  autometricsOptions?: AutometricsDecoratorOptions<T>,
) {
  function decorator<T extends Function>(target: T): void;
  function decorator<T extends Object>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): void;
  function decorator<T extends Function | Object>(
    target: T,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (isFunction(target)) {
      const classDecorator = getAutometricsClassDecorator(autometricsOptions);
      classDecorator(target);

      return;
    }

    if (isObject(target) && propertyKey && descriptor) {
      const methodDecorator = getAutometricsMethodDecorator(autometricsOptions);
      methodDecorator(target, propertyKey, descriptor);
    }
  }

  return decorator;
}

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
