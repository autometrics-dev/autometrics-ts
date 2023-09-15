import { AggregationTemporality } from "@opentelemetry/sdk-metrics";
import { autometrics } from "@autometrics/autometrics";
import { describe, expect, test } from "vitest";

import { COUNTER_NAME } from "../../autometrics/src/constants";
import { init } from "../src/index";
import { metricReader } from "../src/registerExporterInternal";

const foo = autometrics(function foo() {});

describe("temporality test with scheduled push", () => {
  test("clears metrics when they are pushed and DELTA temporality is used", async () => {
    const pushInterval = 50;
    const timeout = 10; // must be smaller than `pushInterval`.

    init({
      url: "http://localhost:4317/metrics",
      pushInterval,
      timeout,
      temporalityPreference: AggregationTemporality.DELTA,
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

    expect(counterMetricBeforePush.dataPoints[0].value).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, pushInterval));

    const collectionResultAfterPush = await metricReader?.collect();

    const counterMetricAfterPush =
      collectionResultAfterPush?.resourceMetrics.scopeMetrics[0].metrics.find(
        (metric) => metric.descriptor.name === COUNTER_NAME,
      );

    if (!counterMetricAfterPush) {
      throw new Error("Counter metric not recorded");
    }

    expect(counterMetricAfterPush.dataPoints.length).toBe(0);
  });
});
