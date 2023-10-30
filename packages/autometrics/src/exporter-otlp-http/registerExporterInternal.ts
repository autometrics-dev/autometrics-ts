import { MetricReader } from "$otel/sdk-metrics";

import { ExporterOptions, registerExporter } from "../../mod.ts";

/**
 * Exported for use in tests only.
 *
 * @internal
 */
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
