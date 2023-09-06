import {
  AggregationTemporality,
  PeriodicExportingMetricReader,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  autometrics,
  ObjectiveLatency,
  ObjectivePercentile,
  registerExporter,
} from "@autometrics/autometrics";

import { collectAndSerialize } from "./util";

let metricReader: PeriodicExportingMetricReader;

describe("Autometrics objectives test", () => {
  beforeAll(async () => {
    metricReader = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });

    registerExporter({ metricReader });
  });

  afterEach(async () => {
    await metricReader.forceFlush();
  });

  test("success rate", async () => {
    const successRateFn = autometrics(
      {
        objective: { name: "test", successRate: ObjectivePercentile.P99 },
      },
      function successRate() {},
    );

    successRateFn();
    successRateFn();

    const callCountMetric =
      /function_calls_total\{\S*function="successRate"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm;

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(callCountMetric);
  });

  test("latency", async () => {
    const latencyFn = autometrics(
      {
        objective: {
          name: "test",
          latency: [ObjectiveLatency.Ms100, ObjectivePercentile.P99_9],
        },
      },
      function latency() {},
    );

    latencyFn();
    latencyFn();

    const durationMetric =
      /function_calls_duration_bucket\{\S*function="latency"\S*objective_name="test",objective_latency_threshold="0.1",objective_percentile="99.9"\S*\} 2/gm;

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(durationMetric);
  });

  test("combined objective ", async () => {
    const combinedObjectiveFn = autometrics(
      {
        objective: {
          name: "test",
          successRate: ObjectivePercentile.P99,
          latency: [ObjectiveLatency.Ms100, ObjectivePercentile.P99_9],
        },
      },
      function combinedObjective() {},
    );

    combinedObjectiveFn();
    combinedObjectiveFn();

    const callCountMetric =
      /function_calls_total\{\S*function="combinedObjective"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm;

    const durationMetric =
      /function_calls_duration_bucket\{\S*function="combinedObjective"\S*objective_name="test",objective_latency_threshold="0.1",objective_percentile="99.9"\S*\} 2/gm;

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(callCountMetric);
    expect(serialized).toMatch(durationMetric);
  });
});
