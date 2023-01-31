import otel from "@opentelemetry/api";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

/**
* This class initializes the right meters with the default Prometheus exporter.
*
* The initialization is done using the static instance method which ensures this
* happens only in the application no matter how many times the method itself is called
* 
* TODO: add configurability to the meter and exporter (ports, resource names etc)
*/
export class OtelMetrics {
	private static INSTANCE: OtelMetrics;

	private constructor() {
		const exporter = new PrometheusExporter();
		const autometricsMeterProvider = new MeterProvider();
		autometricsMeterProvider.addMetricReader(exporter);

		otel.metrics.setGlobalMeterProvider(autometricsMeterProvider);
		return autometricsMeterProvider;
	}

	static instance() {
		if (!OtelMetrics.INSTANCE) {
			OtelMetrics.INSTANCE = new OtelMetrics();
		}

		return OtelMetrics.INSTANCE;
	}
}
