import { autometrics } from "../mod.ts";
import { COUNTER_NAME } from "../src/constants.ts";
import {
  AggregationTemporalityPreference,
  init,
} from "../src/exporter-otlp-http/mod.ts";
import { metricReader } from "../src/exporter-otlp-http/registerExporterInternal.ts";
import { assertEquals } from "./deps.ts";

const foo = autometrics(function foo() {});

Deno.test("Temporality test with on-demand push", async (t) => {
  await t.step(
    "clears metrics when they are pushed and delta temporality is used",
    async () => {
      const timeout = 10;

      init({
        url: "http://localhost:4317/",
        pushInterval: 0,
        temporalityPreference: AggregationTemporalityPreference.DELTA,
        timeout,
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

      assertEquals(counterMetricBeforePush.dataPoints.length, 0);

      await metricReader?.forceFlush();
      await metricReader?.shutdown();
    },
  );
});
