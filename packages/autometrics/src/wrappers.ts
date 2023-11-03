import { ValueType } from "npm:@opentelemetry/api@^1.6.0";

import {
  CALLER_FUNCTION_LABEL,
  CALLER_MODULE_LABEL,
  COUNTER_DESCRIPTION,
  COUNTER_NAME,
  FUNCTION_LABEL,
  GAUGE_DESCRIPTION,
  GAUGE_NAME,
  HISTOGRAM_DESCRIPTION,
  HISTOGRAM_NAME,
  MODULE_LABEL,
  RESULT_LABEL,
} from "./constants.ts";
import { getMeter, metricsRecorded } from "./instrumentation.ts";
import { trace, warn } from "./logger.ts";
import { Objective, getObjectiveAttributes } from "./objectives.ts";
import { getALSInstance } from "./platform.deno.ts";
import { getModulePath, isFunction, isObject, isPromise } from "./utils.ts";

const asyncLocalStorage = getALSInstance();

/**
 * Function Wrapper
 * This seems to be the preferred way for defining functions in TypeScript
 */
// biome-ignore lint/suspicious/noExplicitAny:
type FunctionSig = (...args: any[]) => any;

type AnyFunction<T extends FunctionSig> = (
  ...params: Parameters<T>
) => ReturnType<T>;

/**
 * This type signals to the language service plugin that it should show extra
 * documentation along with the queries.
 */
type AutometricsWrapper<T extends AnyFunction<T>> = AnyFunction<T>;

/**
 * @group Wrapper and Decorator API
 */
export type AutometricsOptions<F extends FunctionSig> = {
  /**
   * Name of your function.
   *
   * This is automatically set by the `autometrics` wrapper, but you may wish to
   * set it explicitly when you use a minifier on your code.
   *
   * @group Wrapper and Decorator API
   */
  functionName?: string;

  /**
   * Name of your class.
   *
   * This is automatically set by the `@Autometrics` decorator, but you may wish
   * to set it explicitly when you use a minifier on your code.
   *
   * @group Wrapper and Decorator API
   */
  className?: string;

  /**
   * Name of the module (usually filename)
   * @group Wrapper and Decorator API
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
   *
   * This may be most useful for top-level functions such as the main HTTP
   * handler that passes requests off to other functions. (default: `false`)
   */
  trackConcurrency?: boolean;

  /**
   * A custom callback function that determines whether a function return should
   * be considered an error by Autometrics. This may be most useful in
   * top-level functions such as the HTTP handler which would catch any errors
   * thrown called from inside the handler.
   *
   * @example
   * ```typescript
   * async function createUser(payload: User) {
   *  // ...
   * }
   *
   * // This will record an error if the handler response status is 4xx or 5xx
   * const recordErrorIf = (res) => res.status >= 400;
   *
   * app.post("/users", autometrics({ recordErrorIf }, createUser)
   * ```
   */
  recordErrorIf?: ReportErrorCondition<F>;

  /**
   * A custom callback function that determines whether a function result
   * should be considered a success (regardless if it threw an error). This
   * may be most useful when you want to ignore certain errors that are thrown
   * by the function.
   */
  recordSuccessIf?: ReportSuccessCondition;
};

/**
 * Callback type used for the `recordErrorIf` option.
 *
 * If this function returns `true`, the given function result will be reported
 * as a failure in your metrics.
 */
export type ReportErrorCondition<F extends FunctionSig> = (
  result: Awaited<ReturnType<F>>,
) => boolean;

/**
 * Callback type used for the `recordSuccessIf` option.
 *
 * If this function returns `true`, the given error will still be reported as
 * a success in your metrics.
 */
export type ReportSuccessCondition = (error: unknown) => boolean;

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
 * @group Wrapper and Decorator API
 */
export function autometrics<F extends FunctionSig>(
  fnInput: F,
): AutometricsWrapper<F>;
export function autometrics<F extends FunctionSig>(
  options: AutometricsOptions<F>,
  fnInput: F,
): AutometricsWrapper<F>;
export function autometrics<F extends FunctionSig>(
  ...args: [F] | [AutometricsOptions<F>, F]
): AutometricsWrapper<F> {
  let functionName: string | undefined;
  let moduleName: string | undefined;
  let fn: F | undefined;
  let objective: Objective | undefined;
  let trackConcurrency = false;
  let recordErrorIf: ReportErrorCondition<F> | undefined;
  let recordSuccessIf: ReportSuccessCondition | undefined;

  const fnOrOptions = args[0];
  const maybeFn = args[1];
  if (typeof fnOrOptions === "function") {
    fn = fnOrOptions;
    functionName = fn.name;
    moduleName = getModulePath();
  } else if (maybeFn) {
    const options = fnOrOptions;
    fn = maybeFn;

    functionName = options.functionName ?? fn.name;
    if (options.className) {
      functionName = `${options.className}#${functionName}`;
    }

    moduleName = options.moduleName ?? getModulePath();

    objective = options.objective;
    trackConcurrency = options.trackConcurrency ?? false;
    recordErrorIf = options.recordErrorIf;
    recordSuccessIf = options.recordSuccessIf;
  }

  if (!functionName) {
    warn(
      "Decorated functions must have a name to successfully create a metric. Function will not be instrumented.",
    );
    return fn as F;
  }

  const { counterObjectiveAttributes, histogramObjectiveAttributes } =
    getObjectiveAttributes(objective);

  const meter = getMeter();
  const counter = meter.createCounter(COUNTER_NAME, {
    description: COUNTER_DESCRIPTION,
    valueType: ValueType.INT,
  });
  const histogram = meter.createHistogram(HISTOGRAM_NAME, {
    description: HISTOGRAM_DESCRIPTION,
    unit: "seconds",
  });
  const concurrencyGauge = trackConcurrency
    ? meter.createUpDownCounter(GAUGE_NAME, {
        description: GAUGE_DESCRIPTION,
        valueType: ValueType.INT,
      })
    : null;

  counter.add(0, {
    [FUNCTION_LABEL]: functionName,
    [MODULE_LABEL]: moduleName,
    [RESULT_LABEL]: "ok",
    [CALLER_FUNCTION_LABEL]: "",
    [CALLER_MODULE_LABEL]: "",
    ...counterObjectiveAttributes,
  });

  return (...params) => {
    const autometricsStart = performance.now();
    concurrencyGauge?.add(1, {
      [FUNCTION_LABEL]: functionName,
      [MODULE_LABEL]: moduleName,
    });

    const callerData = asyncLocalStorage?.getStore();
    const callerFunction = callerData?.callerFunction ?? "";
    const callerModule = callerData?.callerModule ?? "";

    const onSuccess = () => {
      const autometricsDuration = (performance.now() - autometricsStart) / 1000;

      counter.add(1, {
        [FUNCTION_LABEL]: functionName,
        [MODULE_LABEL]: moduleName,
        [RESULT_LABEL]: "ok",
        [CALLER_FUNCTION_LABEL]: callerFunction,
        [CALLER_MODULE_LABEL]: callerModule,
        ...counterObjectiveAttributes,
      });

      histogram.record(autometricsDuration, {
        function: functionName,
        module: moduleName,
        caller_function: callerFunction,
        caller_module: callerModule,
        ...histogramObjectiveAttributes,
      });

      concurrencyGauge?.add(-1, {
        function: functionName,
        module: moduleName,
      });

      metricsRecorded();
    };

    const onError = () => {
      const autometricsDuration = (performance.now() - autometricsStart) / 1000;

      counter.add(1, {
        function: functionName,
        module: moduleName,
        result: "error",
        caller_function: callerFunction,
        caller_module: callerModule,
        ...counterObjectiveAttributes,
      });

      histogram.record(autometricsDuration, {
        function: functionName,
        module: moduleName,
        caller_function: callerFunction,
        caller_module: callerModule,
        ...histogramObjectiveAttributes,
      });

      concurrencyGauge?.add(-1, {
        function: functionName,
        module: moduleName,
        caller_function: callerFunction,
        caller_module: callerModule,
      });

      metricsRecorded();
    };

    const recordSuccess = (returnValue: Awaited<ReturnType<F>>) => {
      try {
        if (recordErrorIf?.(returnValue)) {
          onError();
        } else {
          onSuccess();
        }
      } catch (callbackError) {
        onSuccess();
        trace("Error in recordErrorIf function: ", callbackError);
      }
    };

    const recordError = (error: unknown) => {
      try {
        if (recordSuccessIf?.(error)) {
          onSuccess();
        } else {
          onError();
        }
      } catch (callbackError) {
        onError();
        trace("Error in recordSuccessIf function: ", callbackError);
      }
    };

    function instrumentedFn() {
      try {
        // @ts-ignore TypeScript doesn't the type of `this`.
        const returnValue: ReturnType<F> = fn.apply(this, params);
        if (isPromise(returnValue)) {
          return returnValue
            .then((result: Awaited<typeof returnValue>) => {
              recordSuccess(result);
              return result;
            })
            .catch((error: unknown) => {
              recordError(error);
              throw error;
            });
        }

        // @ts-ignore TypeScript seems to struggle with `Awaited<T>` here...
        recordSuccess(returnValue);
        return returnValue;
      } catch (error) {
        recordError(error);
        throw error;
      }
    }

    return asyncLocalStorage
      ? asyncLocalStorage.run(
          { callerFunction: functionName, callerModule: moduleName },
          instrumentedFn,
        )
      : instrumentedFn();
  };
}

type AutometricsClassDecoratorOptions = Omit<
  AutometricsOptions<FunctionSig>,
  "functionName"
>;

type AutometricsDecoratorOptions<F> = F extends FunctionSig
  ? AutometricsClassDecoratorOptions
  : AutometricsOptions<FunctionSig>;

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
 * <caption>Method decorator that passes in an autometrics options object
 * including SLO</caption>
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
 *
 * @group Wrapper and Decorator API
 */
export function Autometrics<T extends FunctionSig>(
  autometricsOptions: AutometricsOptions<T> = {},
) {
  return (target: T, context: DecoratorContext): T | undefined => {
    switch (context.kind) {
      case "class": {
        const className =
          typeof context.name === "string" ? context.name : target.name;
        context.addInitializer(function () {
          const classDecorator = getAutometricsClassDecorator({
            className,
            ...autometricsOptions,
          });
          classDecorator(this);
        });
        return;
      }

      case "method": {
        const functionName =
          typeof context.name === "string" ? context.name : target.name;
        return autometrics(
          { functionName, ...autometricsOptions },
          target,
        ) as unknown as T;
      }

      default:
        warn("Autometrics decorator can only be used on classes and methods");
    }
  };
}

/**
 * Autometrics decorator that can be used with TypeScript's
 * `experimentalDecorators` option.
 *
 * The options and usage are the same as the modern {@link Autometrics}
 * decorator.
 *
 * @group Wrapper and Decorator API
 */
export function AutometricsLegacy<T extends Function | Object>(
  autometricsOptions?: AutometricsDecoratorOptions<T>,
) {
  function decorator<T extends Function>(target: T): void;
  function decorator<T extends Object>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): void;
  function decorator(
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
 *
 * @internal
 */
export function getAutometricsMethodDecorator(
  autometricsOptions?: AutometricsOptions<FunctionSig>,
) {
  return (
    _target: Object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
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
 *
 * @internal
 */
export function getAutometricsClassDecorator(
  autometricsOptions?: AutometricsClassDecoratorOptions,
): ClassDecorator {
  return (classConstructor: Function) => {
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
