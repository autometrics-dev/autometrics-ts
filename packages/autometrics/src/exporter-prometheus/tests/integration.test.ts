import { assertMatch, assertRejects } from "../../tests/deps.ts";
import { Autometrics, autometrics } from "../../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "./util.ts";

Deno.test("Autometrics integration test", async (t) => {
  await stepWithMetricReader(t, "single function", async (metricReader) => {
    const helloWorldFn = autometrics(function helloWorld() {});

    helloWorldFn();
    helloWorldFn();

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\} 2/gm,
    );
    assertMatch(
      serialized,
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\}/gm,
    );
  });

  await stepWithMetricReader(
    t,
    "single function with throw",
    async (metricReader) => {
      const errorFn = autometrics(function error() {
        return Promise.reject("Oh no");
      });

      await assertRejects(errorFn);

      const serialized = await collectAndSerialize(metricReader);

      assertMatch(
        serialized,
        /function_calls_total\{\S*function="error"\S*result="error"\S*\} 1/gm,
      );
    },
  );

  await stepWithMetricReader(t, "class method", async (metricReader) => {
    // @Autometrics decorator is likely to be used along-side other decorators
    // this tests for any conflicts
    function bar(
      // deno-lint-ignore ban-types
      _target: Function,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;
      descriptor.value = originalMethod;
    }

    @Autometrics() class Foo {
      @bar
      helloWorld() {}
    }

    const foo = new Foo();
    foo.helloWorld();
    foo.helloWorld();

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\} 2/gm,
    );
    assertMatch(
      serialized,
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\}/gm,
    );
  });
});
