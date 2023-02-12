import otel from "@opentelemetry/api";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

let initialized: boolean;

/**
 * This initializes the OpenTelemetry meter and sets up the Prometheus exporter
 */
export const initializeMetrics = (() => {
  let autometricsMeterProvider: MeterProvider;

  return () => {
    if (!autometricsMeterProvider) {
      autometricsMeterProvider = new MeterProvider();
      const exporter = new PrometheusExporter();
      autometricsMeterProvider.addMetricReader(exporter);
      otel.metrics.setGlobalMeterProvider(autometricsMeterProvider);

      return autometricsMeterProvider
    } else {
      return autometricsMeterProvider;
    }
  };

})()
