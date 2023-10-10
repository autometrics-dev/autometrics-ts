import { autometrics } from "../mod.ts";
import { COUNTER_NAME } from "../src/constants.ts";
import { init } from "../src/exporter-otlp-http/mod.ts";
import { metricReader } from "../src/exporter-otlp-http/registerExporterInternal.ts";
import { assertEquals, assertSnapshot } from "./deps.ts";

Deno.test("OTLP/HTTP exporter", async (t) => {
  const port = 4317;
  const url = `http://localhost:${port}/v1/metrics`;

  // We need a real endpoint to submit to, or the OTLP exporter will keep on
  // retrying, which may mess with other tests.
  const serverController = new AbortController();
  const { signal } = serverController;
  Deno.serve({ port, signal }, () => new Response("ok"));

  // make sure that metrics that are collected before `init()` is called are
  // correctly tracked.
  await t.step(
    "collects metrics recorded before init() was called",
    async () => {
      const foo = autometrics(function foo() {});
      foo(); // one before

      init({ url, pushInterval: 5000 });

      foo(); // one after

      if (!metricReader) {
        throw new Error("No metric reader defined");
      }

      const collectionResult = await metricReader.collect();

      const counterMetric =
        collectionResult?.resourceMetrics.scopeMetrics[0].metrics.find(
          (metric) => metric.descriptor.name === COUNTER_NAME,
        );

      if (!counterMetric) {
        throw new Error("Counter metric not recorded");
      }

      assertEquals(counterMetric.dataPoints[0].value, 2);

      await assertSnapshot(t, counterMetric.dataPoints[0].attributes);

      await metricReader.forceFlush();
      await metricReader.shutdown();
    },
  );

  serverController.abort();
});
