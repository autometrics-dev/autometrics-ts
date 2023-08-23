import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "../vendor/opentelemetry-sdk-metrics/mod.ts";
import { assertMatch } from "./deps.ts";
import { collectAndSerialize } from "./util.ts";
import { getMetricsProvider } from "../instrumentation.ts";
import { init } from "../instrumentation.ts";

const buildInfo = {
  version: "1.0.0",
  commit: "123456789",
  branch: "main",
};

/*Deno.test("Autometrics build info tests", async (t) => {
  const exporter = new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  init({ buildInfo, exporter });

  getMetricsProvider();

  await t.step("build info is recorded", async () => {
    const buildInfoMetric =
      /build_info{version="1.0.0",commit="123456789",branch="main",clearmode=""}/gm;

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, buildInfoMetric);
  });

  await exporter.forceFlush({ timeoutMillis: 10 });
});*/
