import {
  PeriodicExportingMetricReader,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  autometrics,
  init,
  ObjectiveLatency,
  ObjectivePercentile,
} from "../src";
import { getMetricsProvider } from "../src/instrumentation";
import { collectAndSerialize } from "./util";

let exporter: PeriodicExportingMetricReader;

describe("Autometrics objectives test", () => {
  beforeAll(async () => {
    exporter = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(0),
    });

    init({ exporter });
    getMetricsProvider();
  });

  afterEach(async () => {
    await exporter.forceFlush();
  });

  test("success rate", async () => {
    const successRateFn = autometrics(
      {
        objective: {
          name: "test",
          success_rate: ObjectivePercentile.P99,
        },
      },
      function successRate() {}
    );

    successRateFn();
    successRateFn();

    const callCountMetric =
      /function_calls_count_total\{\S*function="successRate"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm;

    const serialized = await collectAndSerialize(exporter);

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
      function latency() {}
    );

    latencyFn();
    latencyFn();

    const durationMetric =
      /function_calls_duration_bucket\{\S*function="latency"\S*objective_name="test",objective_latency_threshold="0.1",objective_percentile="99.9"\S*\} 2/gm;

    const serialized = await collectAndSerialize(exporter);

    expect(serialized).toMatch(durationMetric);
  });

  test("combined objective ", async () => {
    const combinedObjectiveFn = autometrics(
      {
        objective: {
          name: "test",
          success_rate: ObjectivePercentile.P99,
          latency: [ObjectiveLatency.Ms100, ObjectivePercentile.P99_9],
        },
      },
      function combinedObjective() {}
    );

    combinedObjectiveFn();
    combinedObjectiveFn();

    const callCountMetric =
      /function_calls_count_total\{\S*function="combinedObjective"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm;

    const durationMetric =
      /function_calls_duration_bucket\{\S*function="combinedObjective"\S*objective_name="test",objective_latency_threshold="0.1",objective_percentile="99.9"\S*\} 2/gm;

    const serialized = await collectAndSerialize(exporter);

    expect(serialized).toMatch(callCountMetric);
    expect(serialized).toMatch(durationMetric);
  });
});
