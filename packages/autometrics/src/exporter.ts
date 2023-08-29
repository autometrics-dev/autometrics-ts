import type { Meter } from "@opentelemetry/api";

import { TemporaryExporter } from "./temporaryExporter";

/**
 * Exporter registered by the user, or a temporary exporter that is used until
 * the user registers their own.
 */
let registeredExporter: Exporter;

/**
 * Interface to implement if you want to implement your own metrics exporter.
 */
export type Exporter = {
  /**
   * Returns a `Meter` for recording metrics.
   */
  getMeter(): Meter;

  /**
   * Will be called when new metrics have been recorded.
   *
   * Exporters that do not want to batch metrics should wait for this
   * function to be called to push their metrics.
   */
  metricsRecorded?(): void;
};

/**
 * Registers the given exporter for metric recording.
 *
 * We (currently) only support a single exporter to be registered.
 *
 * Throws exporter is already registered.
 */
export function registerExporter(exporter: Exporter) {
  if (registeredExporter instanceof TemporaryExporter) {
    registeredExporter.handover(exporter.getMeter());
  } else if (registeredExporter) {
    throw new Error("Only a single exporter may be registered at a time");
  }

  registeredExporter = exporter;
}

/**
 * Returns a `Meter` as produced by the registered exporter.
 *
 * As long as no exporter is registered by the user, Meters are produced by a
 * "temporary exporter" which tracks metrics until the user registers their own.
 *
 * @internal
 */
export function getMeter(): Meter {
  registeredExporter ??= new TemporaryExporter();

  return registeredExporter.getMeter();
}

/**
 * Informs the registered exporter that metrics have been recorded.
 *
 * @internal
 */
export function metricsRecorded() {
  registeredExporter?.metricsRecorded?.();
}
