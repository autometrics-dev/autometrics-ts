import { assertEquals, assertSnapshot } from "../../tests/deps.ts";
import { Autometrics } from "../../../mod.ts";
import { COUNTER_NAME } from "../../constants.ts";
import { init } from "../mod.ts";
import { metricReader } from "../registerExporterInternal.ts";

@Autometrics()
class Foo {
  bar() {}
}

Deno.test("init test", async (t) => {
  // make sure that metrics that are collected before `init()` is called are
  // correctly tracked.
  await t.step(
    "collects metrics recorded before init() was called",
    async () => {
      const foo = new Foo();
      foo.bar(); // one before

      init({ url: "http://localhost:4317", pushInterval: 5000 });

      foo.bar(); // one after

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
