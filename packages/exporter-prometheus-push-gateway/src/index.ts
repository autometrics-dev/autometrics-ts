import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  recordBuildInfo,
  registerExporter,
} from "@autometrics/autometrics";
import { OnDemandMetricReader } from "@autometrics/on-demand-metric-reader";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

import { PushGatewayExporter } from "./pushGatewayExporter";

export type InitOptions = {
  /**
   * The full URL (including https://) of the aggregating push gateway for
   * metrics to be submitted to.
   */
  url: string;

  /**
   * Optional headers to send along to the push gateway.
   */
  headers?: HeadersInit;

  /**
   * The interval for pushing metrics, in milliseconds (default: 5000ms).
   *
   * Set to `0` to push eagerly without batching metrics. This is mainly useful
   * for edge functions and some client-side scenarios.
   */
  pushInterval?: number;

  /**
   * The maximum amount of push requests that may be in-flight concurrently.
   */
  concurrencyLimit?: number;

  /**
   * The timeout for pushing metrics, in milliseconds (default: `1000ms`).
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

    const metricReader = new OnDemandMetricReader({
      exporter,
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
