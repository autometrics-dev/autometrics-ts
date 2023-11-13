import { assertEquals } from "$std/assert/mod.ts";

import { MetricData } from "$otel/sdk-metrics";
import { AggregationTemporalityPreference } from "../../src/exporter-otlp-http/mod.ts";
import { testWithTemporality } from "../testUtils.ts";

const assertMetricDataHasValue =
  (value: number) => (data: MetricData | undefined) => {
    assertEquals(data?.dataPoints.length, 1);
    assertEquals(data?.dataPoints[0].value, value);
  };

Deno.test("Temporality tests", async (t) => {
  await t.step(
    "accumulates metrics when they are pushed on-demand and cumulative temporality is used",
    testWithTemporality({
      temporalityPreference: AggregationTemporalityPreference.CUMULATIVE,
      pushInterval: 0,
      assertBeforePush: assertMetricDataHasValue(1),
      assertAfterPush: assertMetricDataHasValue(1),
    }),
  );
});
