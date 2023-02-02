import otel from "@opentelemetry/api";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

/**
* This initializes the OpenTelemetry meter and sets up the Prometheus exporter
*/

export const otelMetrics = (function(){

	const exporter = new PrometheusExporter();
	const autometricsMeterProvider = new MeterProvider();
	autometricsMeterProvider.addMetricReader(exporter);

	otel.metrics.setGlobalMeterProvider(autometricsMeterProvider);
	return autometricsMeterProvider;
})()

//export class OtelMetrics {
//	private static INSTANCE: OtelMetrics;
//
//	private constructor() {
//		const exporter = new PrometheusExporter();
//		const autometricsMeterProvider = new MeterProvider();
//		autometricsMeterProvider.addMetricReader(exporter);
//
//		otel.metrics.setGlobalMeterProvider(autometricsMeterProvider);
//		return autometricsMeterProvider;
//	}
//
//	static instance() {
//		if (!OtelMetrics.INSTANCE) {
//			OtelMetrics.INSTANCE = new OtelMetrics();
//		}
//
//		return OtelMetrics.INSTANCE;
//	}
//}
