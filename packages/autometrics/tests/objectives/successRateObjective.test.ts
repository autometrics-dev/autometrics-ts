import { assertMatch } from "$std/assert/mod.ts";

import { ObjectivePercentile, autometrics } from "../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "../testUtils.ts";

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
});
