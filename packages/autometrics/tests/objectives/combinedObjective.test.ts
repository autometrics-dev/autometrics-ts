import { assertMatch } from "$std/assert/mod.ts";

import {
  ObjectiveLatency,
  ObjectivePercentile,
  autometrics,
} from "../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "../testUtils.ts";

Deno.test("Objectives test", async (t) => {
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
