import { assertMatch } from "$std/assert/mod.ts";

import {
  ObjectiveLatency,
  ObjectivePercentile,
  autometrics,
} from "../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "../testUtils.ts";

Deno.test("Objectives test", async (t) => {
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
});
