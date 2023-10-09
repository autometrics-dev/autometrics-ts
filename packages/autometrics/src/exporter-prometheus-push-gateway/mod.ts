import { PeriodicExportingMetricReader } from "npm:@opentelemetry/sdk-metrics@^1.17.0";

import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  recordBuildInfo,
  registerExporter,
} from "../../mod.ts";
import { PushGatewayExporter } from "./pushGatewayExporter.ts";

const MAX_SAFE_INTERVAL = 2 ** 31 - 1;

export type InitOptions = {
  /**
   * The full URL (including https://) of the aggregating push gateway for
   * metrics to be submitted to.
   */
  url: string;

  /**
   * Optional headers to send along to the push gateway.
   */
  headers?: Record<string, string>;

  /**
   * The interval for pushing metrics, in milliseconds (default: 5000ms).
   *
   * Set to `0` to push eagerly without batching metrics. This is mainly useful
   * for edge functions and some client-side scenarios.
   *
   * Note the push interval (if non-zero) may not be smaller than the `timeout`.
   */
  pushInterval?: number;

  /**
   * The maximum amount of push requests that may be in-flight concurrently.
   */
  concurrencyLimit?: number;

  /**
   * The timeout for pushing metrics, in milliseconds (default: `1000ms`).
   *
   * Note the timeout may not be larger than the `pushInterval` (if non-zero).
   */
  timeout?: number;

  /**
   * Optional build info to be added to the `build_info` metric.
   */
  buildInfo?: BuildInfo;
};

/**
 * Initializes and registers the Push Gateway exporter for Autometrics.
 */
export function init({
  url,
  headers,
  pushInterval = 5000,
  concurrencyLimit,
  timeout = 1000,
  buildInfo,
}: InitOptions) {
  if (typeof fetch === "undefined") {
    amLogger.warn(
      "Fetch is undefined, cannot push metrics to gateway. Consider adding a global polyfill.",
    );
    return;
  }

  amLogger.info(`Exporter will push to the Prometheus push gateway at ${url}`);

  const exporter = new PushGatewayExporter({ url, headers, concurrencyLimit });

  if (pushInterval > 0) {
    registerExporter({
      metricReader: new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: pushInterval,
        exportTimeoutMillis: timeout,
      }),
    });
  } else if (pushInterval === 0) {
    amLogger.debug("Configuring Autometrics to push metrics eagerly");

    const metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: MAX_SAFE_INTERVAL,
      exportTimeoutMillis: timeout,
    });

    registerExporter({
      metricReader,
      metricsRecorded: () => metricReader.forceFlush(),
    });
  } else {
    throw new Error(`Invalid pushInterval: ${pushInterval}`);
  }

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}
