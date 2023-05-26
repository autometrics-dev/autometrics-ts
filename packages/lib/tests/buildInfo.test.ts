import {
  PeriodicExportingMetricReader,
  InMemoryMetricExporter,
  AggregationTemporality,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { init } from "../src";

let exporter: PeriodicExportingMetricReader;

describe("Autometrics build info tests", () => {
  beforeAll(async () => {
    exporter = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });
    init({ exporter });
  });

  afterEach(async () => {
    await exporter.forceFlush();
  });

  test("build info is recorded", async () => {
    const buildInfo = {
      version: "1.0.0",
      commit: "123456789",
      branch: "main",
    };
    init({ buildInfo });

    const buildInfoGauge = await exporter.collect();
    const buildInfoGaugeData =
      buildInfoGauge.resourceMetrics.scopeMetrics[0].metrics[0].dataPoints[0]
        .attributes;

    expect(buildInfoGaugeData).toEqual(buildInfo);
  });
});
