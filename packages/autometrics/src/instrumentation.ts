import otel from "@opentelemetry/api";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

let initialized = false;

export interface AutometricsConfig {
  exporter?: MetricReader;
}

/**
 * This initializes the OpenTelemetry meter and sets up the Prometheus exporter
 */
export function initializeMetrics(config?: AutometricsConfig) {
  if (initialized) {
    return; // we return early if the metrics exporter is already initialized 
  }

  initialized = true;
  const exporter = config?.exporter || new PrometheusExporter();
  const autometricsMeterProvider = new MeterProvider();
  autometricsMeterProvider.addMetricReader(exporter);
  otel.metrics.setGlobalMeterProvider(autometricsMeterProvider);
}
