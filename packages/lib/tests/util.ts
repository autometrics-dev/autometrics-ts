import { otelExporterPrometheus, otelSdkMetrics } from "../deps.ts";

export async function collectAndSerialize(
  exporter: otelSdkMetrics.PeriodicExportingMetricReader,
) {
  const response = await exporter.collect();

  return new otelExporterPrometheus.PrometheusSerializer().serialize(
    response.resourceMetrics,
  );
}
