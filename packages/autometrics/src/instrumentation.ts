import type { Meter } from "npm:@opentelemetry/api@^1.6.0";
import { MeterProvider } from "npm:@opentelemetry/sdk-metrics@^1.17.0";

import { MetricReader } from "../mod.ts";
import { createDefaultHistogramView } from "./histograms.ts";
import { TemporaryMeter } from "./temporaryMeter.ts";

const meterProvider = new MeterProvider({
  views: [createDefaultHistogramView()],
});

// Due to https://github.com/open-telemetry/opentelemetry-js/issues/4112,
// we cannot start collecting metrics in a meter created from our own
// `MeterProvider` as long as no `MetricReader` is registered yet. To avoid
// this, we track all metrics in a temporary meter instead, from which we will
// handover over all the registered metrics
let meter: Meter = new TemporaryMeter();

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

  if (meter instanceof TemporaryMeter) {
    const temporaryMeter = meter;
    meter = meterProvider.getMeter("autometrics");
    temporaryMeter.handover(meter);
  }

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
  return meter;
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
