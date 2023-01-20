import ts from "typescript";

export function autometricsHeader(): ts.SourceFile {

	const autometrics_header = `
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";

const prometheusOptions = { port: 9090, startServer: true };
const exporter = new PrometheusExporter(prometheusOptions);

const meterProvider = new MeterProvider();
meterProvider.addMetricReader(exporter);
const meter = meterProvider.getMeter("example-prometheus");

` //TODO: add dynamic meter name

	return ts.createSourceFile(
		"instrumentation.ts",
		autometrics_header,
		ts.ScriptTarget.Latest
	)

}

export function autometricsInit(): ts.SourceFile {

	const autometrics_init = `

const __autometricsHistogram = meter.createHistogram("function.calls.duration", {
	description: "Autometrics histogram for tracking function calls",
});
const __autometricsStart = new Date().getTime();

`
	return ts.createSourceFile(
		"instrumentation_init.ts",
		autometrics_init,
		ts.ScriptTarget.Latest
	)

}

export function autometricsReturn(func_name: string): ts.SourceFile {
	const autometrics_return = `

	const __autometricsDuration = new Date().getTime() - __autometricsStart;
	__autometricsHistogram.record(__autometricsDuration, { "function": "${func_name}"});
	`

	return ts.createSourceFile(
		"instrumentation_init.ts",
		autometrics_return,
		ts.ScriptTarget.Latest
	)
}

