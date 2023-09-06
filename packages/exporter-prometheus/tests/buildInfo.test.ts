import {
  PeriodicExportingMetricReader,
  InMemoryMetricExporter,
  AggregationTemporality,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { recordBuildInfo, registerExporter } from "@autometrics/autometrics";

import { collectAndSerialize } from "./util";

const buildInfo = {
  version: "1.0.0",
  commit: "123456789",
  branch: "main",
};

let metricReader: PeriodicExportingMetricReader;

describe("Autometrics build info tests", () => {
  beforeAll(() => {
    metricReader = new PeriodicExportingMetricReader({
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });

    registerExporter({ metricReader });

    recordBuildInfo(buildInfo);
  });

  afterEach(async () => {
    await metricReader.forceFlush();
  });

  test("build info is recorded", async () => {
    const buildInfoMetric =
      /build_info{version="1.0.0",commit="123456789",branch="main",clearmode=""}/gm;

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(buildInfoMetric);
  });
});
