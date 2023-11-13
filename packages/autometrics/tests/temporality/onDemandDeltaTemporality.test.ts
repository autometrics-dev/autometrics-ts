import { assert, assertEquals } from "$std/assert/mod.ts";

import { MetricData } from "$otel/sdk-metrics";
import { AggregationTemporalityPreference } from "../../src/exporter-otlp-http/mod.ts";
import { testWithTemporality } from "../testUtils.ts";

const assertMetricDataIsEmpty = () => (data: MetricData | undefined) => {
  if (data) {
    assertEquals(data.dataPoints.length, 0);
  } else {
    assert(true, "no data is fine, we want it to be empty");
  }
};

Deno.test("Temporality tests", async (t) => {
  await t.step(
    "clears metrics when they are pushed on-demand and delta temporality is used",
    testWithTemporality({
      temporalityPreference: AggregationTemporalityPreference.DELTA,
      pushInterval: 0,
      // there isn't really a "before push" here, because it pushes eagerly:
      assertBeforePush: assertMetricDataIsEmpty(),
      assertAfterPush: assertMetricDataIsEmpty(),
    }),
  );
});
