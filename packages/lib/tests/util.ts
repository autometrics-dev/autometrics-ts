import { PeriodicExportingMetricReader } from "../vendor/opentelemetry-sdk-metrics/mod.ts";
import { PrometheusSerializer } from "../vendor/opentelemetry-exporter-prometheus/mod.ts";

export async function collectAndSerialize(
  exporter: PeriodicExportingMetricReader,
) {
  const response = await exporter.collect();

  return new PrometheusSerializer().serialize(response.resourceMetrics);
}
