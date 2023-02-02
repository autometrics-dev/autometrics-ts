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
	descriptor.value = function (...args: any) {
		let result: any;
		const autometricsStart = new Date().getTime();
		const counter = meter.createCounter("method.calls.count");
		const histogram = meter.createHistogram("method.calls.duration");
		try {
			result = originalFunction.apply(this, args);
			counter.add(1, { method: propertyKey, result: "ok" });
			const autometricsDuration = new Date().getTime() - autometricsStart;
			histogram.record(autometricsDuration, { method: propertyKey });
		} catch (error) {
			const autometricsDuration = new Date().getTime() - autometricsStart;
			counter.add(1, { method: propertyKey, result: "error" });
			histogram.record(autometricsDuration, { method: propertyKey });
		}
		return result;
	};
}

type AnyFunction<T extends (...args: any) => any> = (...params: Parameters<T>) => ReturnType<T>;

interface AutometricsWrapper<T extends (...args: any) => any> extends AnyFunction<T> {
	_autometrics: boolean
}

/**
 * Autometrics wrapper for **functions** that automatically instruments the wrapped function with OpenTelemetry-compatible metrics.
 *
 * Hover over the wrapped function to get the links for generated queries (if you have the language service plugin installed)
 */
export function autometrics<T extends AnyFunction<T>>(
	fn: T
): AutometricsWrapper<T> {
	const _meterProvider = otelMetrics;
	const meter = otel.metrics.getMeter("autometrics-prometheus");

	if (fn.name == undefined || fn.name == null) {
		throw new TypeError(
			"Autometrics decorated function must have a name to succesfully create a metric"
		);
	}

			}
}
