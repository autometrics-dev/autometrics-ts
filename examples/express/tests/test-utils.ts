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

export async function stepWithMetricReader(
  t: any, // FIXME: Should be `TestContext`, but I can't seem to figure out how to import it...
  stepName: string,
  testFn: (metricReader: MetricReader) => Promise<void>,
) {
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  registerExporter({ metricReader });

  try {
    t.test(stepName, () => testFn(metricReader));
  } finally {
    await metricReader.forceFlush();
  }
}
