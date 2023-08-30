import {
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  createDefaultHistogramView,
  recordBuildInfo,
  registerExporter,
} from "@autometrics/autometrics";
import { OnDemandMetricReader } from "@autometrics/on-demand-metric-reader";

import { PushGatewayExporter } from "./pushGatewayExporter";

export type InitOptions = {
  /**
   * The full URL (including http://) of the aggregating push gateway for
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
   * The timeout for pushing metrics, in milliseconds (default: `30_000ms`).
   */
  timeout?: number;

  /**
   * Optional build info to be added to the `build_info` metric (necessary for
   * client-side applications).
   *
   * See {@link BuildInfo}
   */
  buildInfo?: BuildInfo;
};

/**
 * Initializes and registers the Push Gateway exporter for Autometrics.
 */
export function init({
  url,
  headers,
  pushInterval = 5_000,
  concurrencyLimit,
  timeout = 30_000,
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

  const meterProvider = new MeterProvider({
    views: [createDefaultHistogramView()],
  });

  const shouldEagerlyPush = pushInterval === 0;

  let metricReader: MetricReader;
  if (pushInterval > 0) {
    metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: pushInterval,
      exportTimeoutMillis: timeout,
    });
  } else if (shouldEagerlyPush) {
    amLogger.debug("Configuring Autometrics to push metrics eagerly");

    metricReader = new OnDemandMetricReader({
      exporter,
      exportTimeoutMillis: timeout,
    });
  } else {
    throw new Error(`Invalid pushInterval: ${pushInterval}`);
  }

  meterProvider.addMetricReader(metricReader);

  registerExporter({
    getMeter: (name = "autometrics-prometheus-push-gateway") =>
      meterProvider.getMeter(name),
    metricsRecorded: shouldEagerlyPush
      ? () => metricReader.forceFlush()
      : undefined,
  });

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}
