import {
  PeriodicExportingMetricReader,
  InMemoryMetricExporter,
  AggregationTemporality,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { init } from "../src";
import { getMetricsProvider } from "../src/instrumentation.ts";
import { collectAndSerialize } from "./util.ts";

const buildInfo = {
  version: "1.0.0",
  commit: "123456789",
  branch: "main",
};

let exporter: PeriodicExportingMetricReader;

describe("Autometrics build info tests", () => {
  beforeAll(async () => {
    exporter = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });

    init({ buildInfo, exporter });

    getMetricsProvider();
  });

  afterEach(async () => {
    await exporter.forceFlush();
  });

  test("build info is recorded", async () => {
    const buildInfoMetric =
      /build_info{version="1.0.0",commit="123456789",branch="main",clearmode=""}/gm;

    const serialized = await collectAndSerialize(exporter);

    expect(serialized).toMatch(buildInfoMetric);
  });
});
