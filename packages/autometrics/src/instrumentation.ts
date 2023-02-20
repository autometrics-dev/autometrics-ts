import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";

let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

/**
 * If you have a Prometheus exporter already set up, this function allows you to get autometrics to use the same exporter
 *
 * @param 'userExporter' {T extends MetricReader}
 */
export function setMetricsExporter<T extends MetricReader>(userExporter: T) {
  logger("Using the user's Prometheus Exporter configuration");
  exporter = userExporter;
  return;
}

/**
 * Instantiates an autometrics meter provider and default Prometheus exporter (if none exist)
 */
export function getMetricsProvider() {
  if (!autometricsMeterProvider) {
    if (!exporter) {
      logger(
        "Initiating a Prometheus Exporter on port: 9464, endpoint: /metrics",
      );
      exporter = new PrometheusExporter();
    }
    autometricsMeterProvider = new MeterProvider();
    autometricsMeterProvider.addMetricReader(exporter);
  }
  return autometricsMeterProvider;
}

/**
 * Gets the instantiated autometrics meter
 */
export function getMeter(meter = "autometrics-prometheus") {
  return getMetricsProvider().getMeter(meter);
}

function logger(msg: string) {
  console.log(`Autometrics: ${msg}`);
}
