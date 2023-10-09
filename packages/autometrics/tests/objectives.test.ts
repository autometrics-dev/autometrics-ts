import { ObjectiveLatency, ObjectivePercentile, autometrics } from "../mod.ts";
import { assertMatch } from "./deps.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Objectives test", async (t) => {
  await stepWithMetricReader(t, "success rate", async (metricReader) => {
    const successRateFn = autometrics(
      { objective: { name: "test", successRate: ObjectivePercentile.P99 } },
      function successRate() {},
    );

    successRateFn();
    successRateFn();

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_total\{\S*function="successRate"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm,
    );
  });

  await stepWithMetricReader(t, "latency", async (metricReader) => {
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

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_duration_bucket\{\S*function="latency"\S*objective_name="test",objective_latency_threshold="0.1",objective_percentile="99.9"\S*\} 2/gm,
    );
  });

  await stepWithMetricReader(t, "combined objective ", async (metricReader) => {
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

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_total\{\S*function="combinedObjective"\S*objective_name="test",objective_percentile="99"\S*\} 2/gm,
    );
    assertMatch(
      serialized,
      /function_calls_duration_bucket\{\S*function="combinedObjective"\S*objective_name="test",objective_latency_threshold="0.1",objective_percentile="99.9"\S*\} 2/gm,
    );
  });
});
