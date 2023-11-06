import { warn } from "./logger.ts";
import { FunctionSig, isFunction, isObject } from "./utils.ts";
import { AutometricsOptions, autometrics } from "./wrapper.ts";

const EMPTY_OBJECT = {} as const;

const SKIPPED_METHODS = new WeakSet();

type AutometricsClassDecoratorOptions = Omit<
  AutometricsOptions<FunctionSig>,
  "functionName"
>;

type AutometricsDecoratorOptions<T extends DecoratorContext> = T extends {
  kind: "class";
}
  ? AutometricsClassDecoratorOptions
  : AutometricsMethodDecoratorOptions;

type AutometricsLegacyDecoratorOptions<F> = F extends FunctionSig
  ? AutometricsClassDecoratorOptions
  : AutometricsMethodDecoratorOptions;

type AutometricsMethodDecoratorOptions =
  | AutometricsOptions<FunctionSig>
  | AutometricsSkippedMethodDecoratorOptions;

type AutometricsSkippedMethodDecoratorOptions = {
  /**
   * Set this to skip individual methods when the `@Autometrics` decorator is
   * added to a class.
   */
  skip: true;
};

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
 * \@Autometrics()
 * class Foo {
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
export function Autometrics<T extends DecoratorContext>(
  autometricsOptions: AutometricsDecoratorOptions<T> = {},
) {
  return (target: FunctionSig, context: T): FunctionSig | undefined => {
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
        break;
      }

      case "method":
        if ("skip" in autometricsOptions && autometricsOptions.skip) {
          SKIPPED_METHODS.add(target);
        } else {
          const functionName =
            typeof context.name === "string" ? context.name : target.name;
          return autometrics({ functionName, ...autometricsOptions }, target);
        }
        break;

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
  autometricsOptions: AutometricsLegacyDecoratorOptions<T> = {},
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
    if (isFunction(target) && !propertyKey) {
      const classDecorator = getAutometricsClassDecorator({
        className: target.name,
        ...(autometricsOptions as AutometricsClassDecoratorOptions),
      });
      classDecorator(target);
    } else if (target && propertyKey && descriptor) {
      if ("skip" in autometricsOptions && autometricsOptions.skip) {
        SKIPPED_METHODS.add(descriptor.value);
      } else {
        const methodDecorator =
          getAutometricsMethodDecorator(autometricsOptions);
        methodDecorator(target, propertyKey, descriptor);
      }
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
  autometricsOptions?: AutometricsMethodDecoratorOptions,
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
    const { prototype } = classConstructor;
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
        !descriptor ||
        SKIPPED_METHODS.has(descriptor.value)
      ) {
        continue;
      }

      const instrumentedDescriptor = methodDecorator(
        EMPTY_OBJECT,
        propertyName,
        descriptor,
      );

      Object.defineProperty(prototype, propertyName, instrumentedDescriptor);
    }

    const staticPropertyNames = Object.getOwnPropertyNames(classConstructor);
    const staticDecorator = getAutometricsMethodDecorator({
      static: true,
      ...autometricsOptions,
    });

    for (const propertyName of staticPropertyNames) {
      // biome-ignore lint/suspicious/noExplicitAny: I know it's not pretty...
      const property = (classConstructor as Record<string, any>)[propertyName];
      const descriptor = Object.getOwnPropertyDescriptor(
        classConstructor,
        propertyName,
      );

      if (
        typeof property !== "function" ||
        !descriptor ||
        SKIPPED_METHODS.has(descriptor.value)
      ) {
        continue;
      }

      const instrumentedDescriptor = staticDecorator(
        EMPTY_OBJECT,
        propertyName,
        descriptor,
      );

      Object.defineProperty(
        classConstructor,
        propertyName,
        instrumentedDescriptor,
      );
    }
  };
}
