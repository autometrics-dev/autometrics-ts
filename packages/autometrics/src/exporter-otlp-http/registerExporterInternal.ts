import { MetricReader } from "npm:@opentelemetry/sdk-metrics@^1.17.0";

import { ExporterOptions, registerExporter } from "../../mod.ts";

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
