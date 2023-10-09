import { autometrics } from "../mod.ts";
import { COUNTER_NAME } from "../src/constants.ts";
import { init } from "../src/exporter-otlp-http/mod.ts";
import { metricReader } from "../src/exporter-otlp-http/registerExporterInternal.ts";
import { assertEquals, assertSnapshot } from "./deps.ts";

const foo = autometrics(function foo() {});

Deno.test("OTLP exporter", async (t) => {
  // make sure that metrics that are collected before `init()` is called are
  // correctly tracked.
  await t.step(
    "collects metrics recorded before init() was called",
    async () => {
      foo(); // one before

      init({ url: "http://localhost:4317", pushInterval: 5000 });

      foo(); // one after

      const collectionResult = await metricReader?.collect();

      const counterMetric =
        collectionResult?.resourceMetrics.scopeMetrics[0].metrics.find(
          (metric) => metric.descriptor.name === COUNTER_NAME,
        );

      if (!counterMetric) {
        throw new Error("Counter metric not recorded");
      }

      assertEquals(counterMetric.dataPoints[0].value, 2);

      await assertSnapshot(t, counterMetric.dataPoints[0].attributes);
    },
  );
});
