import { AggregationTemporalityPreference, init } from "../mod.ts";
import { assertEquals } from "../../tests/deps.ts";
import { autometrics } from "../../../mod.ts";
import { COUNTER_NAME } from "../../constants.ts";
import { metricReader } from "../registerExporterInternal.ts";

const foo = autometrics(function foo() {});

Deno.test("temporality test with scheduled push", async (t) => {
  await t.step(
    "clears metrics when they are pushed and DELTA temporality is used",
    async () => {
      const pushInterval = 50;
      const timeout = 10; // must be smaller than `pushInterval`.

      init({
        url: "http://localhost:4317/",
        pushInterval,
        timeout,
        temporalityPreference: AggregationTemporalityPreference.DELTA,
      });

      foo(); // record metric

      const collectionResultBeforePush = await metricReader?.collect();

      const counterMetricBeforePush =
        collectionResultBeforePush?.resourceMetrics.scopeMetrics[0].metrics.find(
          (metric) => metric.descriptor.name === COUNTER_NAME,
        );

      if (!counterMetricBeforePush) {
        throw new Error("Counter metric not recorded");
      }

      assertEquals(counterMetricBeforePush.dataPoints[0].value, 1);

      await new Promise((resolve) => setTimeout(resolve, pushInterval));

      const collectionResultAfterPush = await metricReader?.collect();

      const counterMetricAfterPush =
        collectionResultAfterPush?.resourceMetrics.scopeMetrics[0].metrics.find(
          (metric) => metric.descriptor.name === COUNTER_NAME,
        );

      if (!counterMetricAfterPush) {
        throw new Error("Counter metric not recorded");
      }

      assertEquals(counterMetricAfterPush.dataPoints.length, 0);
    },
  );
});
