import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  Autometrics,
  autometrics,
  registerExporter,
} from "@autometrics/autometrics";
import { describe, test, expect, beforeAll, afterEach } from "vitest";

import { collectAndSerialize } from "./util";

let metricReader: PeriodicExportingMetricReader;

describe("Autometrics integration test", () => {
  beforeAll(async () => {
    metricReader = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });

    registerExporter({ metricReader });
  });

  afterEach(async () => {
    await metricReader.forceFlush();
  });

  test("single function", async () => {
    const callCountMetric =
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\} 2/gm;
    const durationMetric =
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\}/gm;

    const helloWorldFn = autometrics(function helloWorld() {});

    helloWorldFn();
    helloWorldFn();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(callCountMetric);
    expect(serialized).toMatch(durationMetric);
  });

  test("single function with throw", async () => {
    const errorCountMetric =
      /function_calls_total\{\S*function="error"\S*result="error"\S*\} 1/gm;

    const errorFn = autometrics(async function error() {
      return Promise.reject("Oh no");
    });

    await expect(errorFn()).rejects.toThrowError();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(errorCountMetric);
  });

  test("class method", async () => {
    const callCountMetric =
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\} 2/gm;
    const durationMetric =
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\}/gm;

    // @Autometrics decorator is likely to be used along-side other decorators
    // this tests for any conflicts
    function bar(
      target: Function,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;
      descriptor.value = originalMethod;
    }

    @Autometrics()
    class Foo {
      @bar
      helloWorld() {}
    }

    const foo = new Foo();
    foo.helloWorld();
    foo.helloWorld();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(callCountMetric);
    expect(serialized).toMatch(durationMetric);
  });
});
