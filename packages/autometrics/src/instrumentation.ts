import type { Meter } from "@opentelemetry/api";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";

import { createDefaultHistogramView } from "./histograms";

const meterProvider = new MeterProvider({
  views: [createDefaultHistogramView()],
});

/**
 * Registered listeners that should be notified when `metricsRecorded()` is
 * called.
 */
const registeredMetricsRecordedListeners: Array<() => void> = [];

/**
 * Options for registering an Autometrics exporter.
 */
export type ExporterOptions = {
  /**
   * The exporter's `MetricReader`. Will be registered with the `MeterProvider`.
   */
  metricReader: MetricReader;

  /**
   * Optional callback that will be called when new metrics have been recorded.
   *
   * Exporters that do not want to batch metrics should wait for this
   * function to be called to push their metrics.
   */
  metricsRecorded?(): void;
};

/**
 * Registers an Autometrics exporter.
 */
export function registerExporter({
  metricReader,
  metricsRecorded,
}: ExporterOptions) {
  meterProvider.addMetricReader(metricReader);

  if (metricsRecorded) {
    registeredMetricsRecordedListeners.push(metricsRecorded);
  }
}

/**
 * Returns a `Meter` for recording metrics.
 *
 * @internal
 */
export function getMeter(): Meter {
  return meterProvider.getMeter("autometrics");
}

/**
 * Informs the registered listeners that metrics have been recorded.
 *
 * @internal
 */
export function metricsRecorded() {
  for (const listener of registeredMetricsRecordedListeners) {
    listener();
  }
}
