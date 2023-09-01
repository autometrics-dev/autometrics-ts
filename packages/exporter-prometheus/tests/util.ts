import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";
import type { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

export async function collectAndSerialize(
  metricReader: PeriodicExportingMetricReader,
) {
  const response = await metricReader.collect();

  return new PrometheusSerializer().serialize(response.resourceMetrics);
}
