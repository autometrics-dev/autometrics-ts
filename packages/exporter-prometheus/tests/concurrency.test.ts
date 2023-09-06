import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { autometrics, registerExporter } from "@autometrics/autometrics";

import { collectAndSerialize } from "./util";

let metricReader: PeriodicExportingMetricReader;

describe("Autometrics concurrency tests", () => {
  beforeAll(async () => {
    metricReader = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });

    registerExporter({ metricReader });
  });

  afterEach(async () => {
    await metricReader.forceFlush();
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

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(concurrencyCountFinishedMetric);
  });
});
