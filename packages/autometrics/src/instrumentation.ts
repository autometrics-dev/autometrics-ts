import otel from "@opentelemetry/api";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

let initialized: boolean;

/**
 * This initializes the OpenTelemetry meter and sets up the Prometheus exporter
 */
export function initializeMetrics() {
  const exporter = new PrometheusExporter();
  if (initialized) {
    return;
  } else {
    const autometricsMeterProvider = new MeterProvider();
    autometricsMeterProvider.addMetricReader(exporter);

    otel.metrics.setGlobalMeterProvider(autometricsMeterProvider);
    initialized = true;
  }
  return;
}
