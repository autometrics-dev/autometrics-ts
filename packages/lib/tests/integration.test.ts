import { Autometrics, autometrics, init } from "../mod.ts";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { assertMatch, assertRejects } from "./deps.ts";
import { getMetricsProvider } from "../src/instrumentation.ts";
import { collectAndSerialize } from "./util.ts";

/*Deno.test("Autometrics integration test", async (t) => {
  const exporter = new PeriodicExportingMetricReader({
    // 0 - using delta aggregation temporality setting
    // to ensure data submitted to the gateway is accurate
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  init({ exporter });
  getMetricsProvider();

  const testAndFlush = async (name: string, fn: (t: Deno.TestContext) => void | Promise<void>) => {
    await t.step(name, fn);

    await exporter.forceFlush({ timeoutMillis: 10 });
  };

  await testAndFlush("single function", async () => {
    const callCountMetric =
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\} 2/gm;
    const durationMetric =
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\}/gm;

    const helloWorldFn = autometrics(function helloWorld() {});

    helloWorldFn();
    helloWorldFn();

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, callCountMetric);
    assertMatch(serialized, durationMetric);
  });

  await testAndFlush("single function with throw", async () => {
    const errorCountMetric =
      /function_calls_total\{\S*function="error"\S*result="error"\S*\} 1/gm;

    const errorFn = autometrics(function error() {
      return Promise.reject("Oh no");
    });

    await assertRejects(errorFn);

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, errorCountMetric);
  });

  await testAndFlush("class method", async () => {
    const callCountMetric =
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\} 2/gm;
    const durationMetric =
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\}/gm;

    // @Autometrics decorator is likely to be used along-side other decorators
    // this tests for any conflicts
    function Bar() {
      return function Bar(
        target: Object,
        propertyKey: string,
        descriptor: PropertyDescriptor,
      ) {
        const originalMethod = descriptor.value;
        descriptor.value = originalMethod;
      };
    }

    @Autometrics()
    class Foo {
      @Bar()
      helloWorld() {}
    }

    const foo = new Foo();
    foo.helloWorld();
    foo.helloWorld();

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, callCountMetric);
    assertMatch(serialized, durationMetric);
  });
});*/
