import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";
import { registerExporter } from "@autometrics/autometrics";

export async function collectAndSerialize(metricReader: MetricReader) {
  const response = await metricReader.collect();

  return new PrometheusSerializer().serialize(response.resourceMetrics);
}

export async function testWithMetricReader(
  testFn: (metricReader: MetricReader) => Promise<void>,
) {
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  registerExporter({ metricReader });

  try {
    await testFn(metricReader);
  } finally {
    await metricReader.forceFlush();
  }
}
