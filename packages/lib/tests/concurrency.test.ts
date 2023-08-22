import {
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { assertMatch } from "./deps.ts";
import { autometrics, init } from "../mod.ts";
import { getMetricsProvider } from "../instrumentation.ts";
import { collectAndSerialize } from "./util.ts";

/*Deno.test("Autometrics concurrency tests", async (t) => {
  const exporter = new PeriodicExportingMetricReader({
    // 0 - using delta aggregation temporality setting
    // to ensure data submitted to the gateway is accurate
    exporter: new InMemoryMetricExporter(0),
  });

  init({ exporter });
  getMetricsProvider();

  await t.step("increases and decreases the concurrency gauge", async () => {
    const sleepFn = autometrics(
      { trackConcurrency: true },
      async function sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      },
    );

    const one = sleepFn(1000);
    const two = sleepFn(1000);
    const three = sleepFn(2000);

    await Promise.all([one, two]);

    const concurrencyCountFinishedMetric =
      /function_calls_concurrent\{\S*function="sleep"\S*\} 1/gm;

    const serialized = await collectAndSerialize(exporter);

    assertMatch(serialized, concurrencyCountFinishedMetric);

    await three;
  });

  await exporter.forceFlush({ timeoutMillis: 10 });
});*/
