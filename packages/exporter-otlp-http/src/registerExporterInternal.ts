import { ExporterOptions, registerExporter } from "@autometrics/autometrics";
import { MetricReader } from "@opentelemetry/sdk-metrics";

export let metricReader: MetricReader | undefined;

/**
 * Makes the registered metric reader available internally for use by tests.
 *
 * This function (and the variable above) should not be exposed to consumers of
 * the library.
 *
 * @internal
 */
export function registerExporterInternal(options: ExporterOptions) {
  metricReader = options.metricReader;
  registerExporter(options);
}
