import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";

let autometricsMeterProvider: MeterProvider;
let exporter: PrometheusExporter;

/**
 * If you have a Prometheus exporter already set up, this function allows you to get autometrics to use the same exporter
*
* @param 'userExporter' {PrometheusExporter}
 */
export function setMetricsExporter(userExporter: PrometheusExporter) {
	console.log("Using the user's Prometheus Exporter configuration")
  exporter = userExporter;
  return;
}

/**
 * Gets the instantiated meter provider
 */
export function getMetricsProvider() {
  if (!autometricsMeterProvider) {
    if (!exporter) {
			console.log("Initiating a Prometheus Exporter on port: 9464, endpoint: /metrics")
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
	return getMetricsProvider().getMeter(meter)
}

