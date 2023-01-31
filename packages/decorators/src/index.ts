import { OtelMetrics } from "./instrumentation";
import otel from "@opentelemetry/api"

/**
* Autometrics automatically instruments the decorated class method or a wrapped function.
*
* Hover over the method/function itself to get the links for your metrics (if you have the language service plugin installed)
*/
export default function autometrics(_target: Object, property_key: string, descriptor: PropertyDescriptor) {
	OtelMetrics.instance() // should ensure the instrumentation is initialized only once no matter how many times this function is called
	const meter = otel.metrics.getMeter("autometrics-prometheus");

	const original_function = descriptor.value;

	descriptor.value = function(...args: any) {
		let result: any;
		const autometrics_start = new Date().getTime();
		const counter = meter.createCounter("method.calls.count")
		const histogram = meter.createHistogram("method.calls.duration")
		try {
			result = original_function.apply(this, args)
			counter.add(1, { "method": property_key, "result": "ok" })
			const autometrics_duration = new Date().getTime() - autometrics_start;
			histogram.record(autometrics_duration, { "method": property_key })
		} catch (error) {
			const autometrics_duration = new Date().getTime() - autometrics_start;
			counter.add(1, { "method": property_key, "result": "error" })
			histogram.record(autometrics_duration, { "method": property_key })
		}
		return result
	}
}

type AnyFunction = (...args: any[]) => any

/**
* Autometrics automatically instruments the wrapped function with OpenTelemetry-compatible metrics.
* 
* Hover over the wrapped function to get the links for generated queries (if you have the language service plugin installed)
*/
export function autometrics_wrapper<T extends AnyFunction>(fn: T): (...params: Parameters<T>) => ReturnType<T> {

	OtelMetrics.instance() // should ensure the instrumentation is initialized only once no matter how many times this function is called
	const meter = otel.metrics.getMeter("autometrics-prometheus");

	return function(...params: Parameters<T>): ReturnType<T> {
		if (fn.name == undefined || fn.name == null) {
			throw new TypeError("Autometrics decorated function must have a name to succesfully create a metric")
		}
		let result: any;
		const autometrics_start = new Date().getTime();
		const counter = meter.createCounter("function.calls.count")
		const histogram = meter.createHistogram("function.calls.duration")
		try {
			result = fn(...params);
			counter.add(1, { "function": fn.name, "result": "ok" })
			const autometrics_duration = new Date().getTime() - autometrics_start;
			histogram.record(autometrics_duration, { "function": fn.name })
		} catch (error) {
			const autometrics_duration = new Date().getTime() - autometrics_start;
			counter.add(1, { "method": fn.name, "result": "error" })
			histogram.record(autometrics_duration, { "method": fn.name })
		}
		return result
	}
}
