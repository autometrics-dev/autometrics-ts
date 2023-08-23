import { assertMatch } from "./deps.ts";
import {
  autometrics,
  init,
  ObjectiveLatency,
  ObjectivePercentile,
} from "../mod.ts";
import { collectAndSerialize } from "./util.ts";
import { getMetricsProvider } from "../instrumentation.ts";
import { otelSdkMetrics } from "../deps.ts";

/*Deno.test("Autometrics objectives test", async (t) => {
  const exporter = new otelSdkMetrics.PeriodicExportingMetricReader({
    // 0 - using delta aggregation temporality setting
    // to ensure data submitted to the gateway is accurate
    exporter: new otelSdkMetrics.InMemoryMetricExporter(0),
  });

  init({ exporter });
  getMetricsProvider();

  const testAndFlush = async (name: string, fn: (t: Deno.TestContext) => void | Promise<void>) => {
    await t.step(name, fn);

    await exporter.forceFlush({ timeoutMillis: 10 });
  };

  await testAndFlush("success rate", async () => {
    const successRateFn = autometrics(
      {
        objective: {
          name: "test",
          successRate: ObjectivePercentile.P99,
        },
      },
      function successRate() {},
    );

    successRateFn();
    successRateFn();

    const callCountMetric =
      /function_calls_total\{\S*function="successRate"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm;

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, callCountMetric);
  });

  await testAndFlush("latency", async () => {
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

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, durationMetric);
  });

  await testAndFlush("combined objective ", async () => {
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

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, callCountMetric);
    assertMatch(serialized, durationMetric);
  });
});*/
