import {
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { autometrics, init } from "../src";
import { getMetricsProvider } from "../src/instrumentation";
import { collectAndSerialize } from "./util";

let exporter: PeriodicExportingMetricReader;

describe("Autometrics concurrency tests", () => {
  beforeAll(async () => {
    exporter = new PeriodicExportingMetricReader({
      // 0 - using delta aggregation temporality setting
      // to ensure data submitted to the gateway is accurate
      exporter: new InMemoryMetricExporter(0),
    });

    init({ exporter });
    getMetricsProvider();
  });

  afterEach(async () => {
    await exporter.forceFlush();
  });

  test("increases and decreases the concurrency gauge", async () => {
    const sleepFn = autometrics(
      { trackConcurrency: true },
      async function sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      },
    );

    const one = sleepFn(1000);
    const two = sleepFn(1000);
    const _three = sleepFn(20000);

    await Promise.all([one, two]);

    const concurrencyCountFinishedMetric =
      /function_calls_concurrent\{\S*function="sleep"\S*\} 1/gm;

    const serialized = await collectAndSerialize(exporter);

    expect(serialized).toMatch(concurrencyCountFinishedMetric);
  });
});
