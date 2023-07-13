import { Autometrics, autometrics, init } from "../src";
import { describe, test, expect, beforeAll, afterEach } from "vitest";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { getMetricsProvider } from "../src/instrumentation";
import { collectAndSerialize } from "./util";

let exporter: PeriodicExportingMetricReader;

describe("Autometrics integration test", () => {
  beforeAll(async () => {
    exporter = new PeriodicExportingMetricReader({
      // 0 - using delta aggregation temporality setting
      // to ensure data submitted to the gateway is accurate
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });

    init({ exporter });
    getMetricsProvider();
  });

  afterEach(async () => {
    await exporter.forceFlush();
  });

  test("single function", async () => {
    const callCountMetric =
      /function_calls_count_total\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\} 2/gm;
    const durationMetric =
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\}/gm;

    const helloWorldFn = autometrics(function helloWorld() {});

    helloWorldFn();
    helloWorldFn();

    const serialized = await collectAndSerialize(exporter);

    expect(serialized).toMatch(callCountMetric);
    expect(serialized).toMatch(durationMetric);
  });

  test("single function with throw", async () => {
    const errorCountMetric =
      /function_calls_count_total\{\S*function="error"\S*result="error"\S*\} 1/gm;

    const errorFn = autometrics(async function error() {
      return Promise.reject("Oh no");
    });

    await expect(errorFn()).rejects.toThrowError();

    const serialized = await collectAndSerialize(exporter);

    expect(serialized).toMatch(errorCountMetric);
  });

  test("class method", async () => {
    const callCountMetric =
      /function_calls_count_total\{\S*function="helloWorld"\S*module="\/packages\/lib\/tests\/integration.test.ts"\S*\} 2/gm;
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

    expect(serialized).toMatch(callCountMetric);
    expect(serialized).toMatch(durationMetric);
  });
});
