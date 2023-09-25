import { describe, expect, test } from "vitest";

import { Autometrics } from "@autometrics/autometrics";
import { COUNTER_NAME } from "../../autometrics/src/constants";
import { init } from "../src/index";
import { metricReader } from "../src/registerExporterInternal";

@Autometrics()
class Foo {
  bar() {}
}

describe("init test", () => {
  // make sure that metrics that are collected before `init()` is called are
  // correctly tracked.
  test("collects metrics recorded before init() was called", async () => {
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

    expect(counterMetric.dataPoints[0].value).toBe(2);
    expect(counterMetric.dataPoints[0].attributes).toMatchInlineSnapshot(`
      {
        "caller": undefined,
        "function": "bar",
        "module": "/packages/exporter-otlp-http/tests/init.test.ts",
        "objective_name": "",
        "objective_percentile": "",
        "result": "ok",
      }
    `);
  });
});
