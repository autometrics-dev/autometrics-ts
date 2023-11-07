import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MetricReader,
  PeriodicExportingMetricReader,
} from "$otel/sdk-metrics";

import { registerExporter } from "../mod.ts";
import { PrometheusSerializer } from "../src/exporter-prometheus/PrometheusSerializer.ts";

export async function collectAndSerialize(metricReader: MetricReader) {
  const response = await metricReader.collect();

  return new PrometheusSerializer().serialize(response.resourceMetrics);
}

export async function stepWithMetricReader(
  t: Deno.TestContext,
  stepName: string,
  testFn: (reader: MetricReader) => Promise<void>,
) {
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  registerExporter({ metricReader });

  try {
    await t.step(stepName, () => testFn(metricReader));
  } finally {
    await metricReader.forceFlush();
    await metricReader.shutdown();
  }
}
