import { assertEquals } from "$std/assert/mod.ts";

import { MetricData } from "$otel/sdk-metrics";
import { autometrics } from "../mod.ts";
import { COUNTER_NAME } from "../src/constants.ts";
import {
  AggregationTemporalityPreference,
  init,
} from "../src/exporter-otlp-http/mod.ts";
import { metricReader } from "../src/exporter-otlp-http/registerExporterInternal.ts";

const assertMetricDataHasValue = (value: number) => (data: MetricData) => {
  assertEquals(data.dataPoints.length, 1);
  assertEquals(data.dataPoints[0].value, value);
};

const assertMetricDataIsEmpty = () => (data: MetricData) => {
  assertEquals(data.dataPoints.length, 0);
};

Deno.test("Temporality tests", async (t) => {
  const port = 4317;
  const url = `http://localhost:${port}/v1/metrics`;

  // We need a real endpoint to submit to, or the OTLP exporter will keep on
  // retrying, which may mess with other tests.
  const serverController = new AbortController();
  const { signal } = serverController;
  Deno.serve({ port, signal }, () => new Response("ok"));

  await t.step(
    "accumulates metrics when they are pushed on-demand and cumulative temporality is used",
    testWithTemporality({
      temporalityPreference: AggregationTemporalityPreference.CUMULATIVE,
      pushInterval: 0,
      assertBeforePush: assertMetricDataHasValue(1),
      assertAfterPush: assertMetricDataHasValue(1),
    }),
  );

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

  await t.step(
    "accumulates metrics when they are pushed at an interval and cumulative temporality is used",
    testWithTemporality({
      temporalityPreference: AggregationTemporalityPreference.CUMULATIVE,
      pushInterval: 50,
      assertBeforePush: assertMetricDataHasValue(1),
      assertAfterPush: assertMetricDataHasValue(1),
    }),
  );

  await t.step(
    "clears metrics when they are pushed at an interval and delta temporality is used",
    testWithTemporality({
      temporalityPreference: AggregationTemporalityPreference.DELTA,
      pushInterval: 50,
      assertBeforePush: assertMetricDataHasValue(1),
      assertAfterPush: assertMetricDataIsEmpty(),
    }),
  );

  function testWithTemporality({
    temporalityPreference,
    pushInterval,
    assertBeforePush,
    assertAfterPush,
  }: {
    temporalityPreference: AggregationTemporalityPreference;
    pushInterval: number;
    assertBeforePush: (data: MetricData) => void;
    assertAfterPush: (data: MetricData) => void;
  }) {
    return async () => {
      const timeout = 10;

      init({ url, pushInterval, temporalityPreference, timeout });

      if (!metricReader) {
        throw new Error("No metric reader defined");
      }

      const foo = autometrics(function foo() {});
      foo(); // record metric

      const collectionResultBeforePush = await metricReader.collect();

      const counterMetricBeforePush =
        collectionResultBeforePush?.resourceMetrics.scopeMetrics[0].metrics.find(
          (metric) => metric.descriptor.name === COUNTER_NAME,
        );

      if (!counterMetricBeforePush) {
        throw new Error("Counter metric not recorded");
      }

      assertBeforePush(counterMetricBeforePush);

      await new Promise((resolve) => setTimeout(resolve, pushInterval));

      const collectionResultAfterPush = await metricReader.collect();

      const counterMetricAfterPush =
        collectionResultAfterPush?.resourceMetrics.scopeMetrics[0].metrics.find(
          (metric) => metric.descriptor.name === COUNTER_NAME,
        );

      if (!counterMetricAfterPush) {
        throw new Error("Counter metric not recorded");
      }

      assertAfterPush(counterMetricAfterPush);

      await metricReader.forceFlush();
      await metricReader.shutdown();
    };
  }

  serverController.abort();
});
