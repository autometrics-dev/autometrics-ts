import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";
import type { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

export async function collectAndSerialize(
  exporter: PeriodicExportingMetricReader
) {
  const response = await exporter.collect();

  return new PrometheusSerializer().serialize(response.resourceMetrics);
}
