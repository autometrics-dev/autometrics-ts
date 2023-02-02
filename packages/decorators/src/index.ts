import { otelMetrics } from "./instrumentation";
import otel from "@opentelemetry/api";

/**
 * Autometrics decorator for **class methods** that automatically instruments the decorated method with OpenTelemetry-compatible metrics.
 *
 * Hover over the method to get the links for generated queries (if you have the language service plugin installed)
 */
export function Autometrics(
	_target: Object,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	const _meterProvider = otelMetrics;
	const meter = otel.metrics.getMeter("autometrics-prometheus");

	const originalFunction = descriptor.value;

	descriptor.value = Object.assign(
		function(...args: any) {
			let result: any;
			const autometricsStart = new Date().getTime();
			const counter = meter.createCounter("method.calls.count");
			const histogram = meter.createHistogram("method.calls.duration");
			try {
				result = originalFunction.apply(this, args);
				counter.add(1, { method: propertyKey, result: "ok" });
				const autometricsDuration =
					new Date().getTime() - autometricsStart;
				histogram.record(autometricsDuration, { method: propertyKey });
			} catch (error) {
				const autometricsDuration =
					new Date().getTime() - autometricsStart;
				counter.add(1, { method: propertyKey, result: "error" });
				histogram.record(autometricsDuration, { method: propertyKey });
			}
			return result;
		},
		{ _autometrics: true }
	);
}

type AnyFunction = (...args: any[]) => any;

/**
 * Autometrics wrapper for **functions** that automatically instruments the wrapped function with OpenTelemetry-compatible metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if you have the language service plugin installed)
 */
export function autometrics<T extends AnyFunction>(
	fn: T
): (...params: Parameters<T>) => ReturnType<T> & { _autometrics: boolean } {
	const _meterProvider = otelMetrics;
	const meter = otel.metrics.getMeter("autometrics-prometheus");

	if (fn.name == undefined || fn.name == null) {
		throw new TypeError(
			"Autometrics decorated function must have a name to succesfully create a metric"
		);
	}

	return Object.assign(
		function(...params: Parameters<T>): ReturnType<T> {
			let result: any;
			const autometricsStart = new Date().getTime();
			const counter = meter.createCounter("function.calls.count");
			const histogram = meter.createHistogram("function.calls.duration");
			try {
				result = fn(...params);
				counter.add(1, { function: fn.name, result: "ok" });
				const autometricsDuration =
					new Date().getTime() - autometricsStart;
				histogram.record(autometricsDuration, { function: fn.name });
			} catch (error) {
				const autometricsDuration =
					new Date().getTime() - autometricsStart;
				counter.add(1, { method: fn.name, result: "error" });
				histogram.record(autometricsDuration, { method: fn.name });
			}
			return result;
		},
		{ _autometrics: true }
	);
}
