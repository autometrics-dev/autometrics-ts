import {
  AggregationTemporality,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  AggregationTemporalityPreference,
  OTLPMetricExporter,
} from "@opentelemetry/exporter-metrics-otlp-http";
import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  recordBuildInfo,
} from "@autometrics/autometrics";
import { OnDemandMetricReader } from "@autometrics/on-demand-metric-reader";

import { registerExporterInternal } from "./registerExporterInternal";

export type InitOptions = {
  /**
   * URL of the OpenTelemetry Collector to push metrics to.
   */
  url: string;

  /**
   * Optional headers to send along to the OTLP endpoint.
   */
  headers?: Record<string, unknown>;

  /**
   * The interval for pushing metrics, in milliseconds (default: `5000ms`).
   *
   * Set to `0` to push eagerly without batching metrics. This is mainly useful
   * for edge functions and some client-side scenarios.
   *
   * Note the push interval may not be smaller than the `timeout`.
   */
  pushInterval?: number;

  /**
   * The maximum amount of push requests that may be in-flight concurrently.
   */
  concurrencyLimit?: number;

  /**
   * The timeout for pushing metrics, in milliseconds (default: `1000ms`).
   *
   * Note the timeout may not be larger than the `pushInterval`.
   */
  timeout?: number;

  /**
   * The aggregation temporality preference.
   *
   * By default, we use `AggregationTemporality.CUMULATIVE`. You may wish to
   * change this depending on the OpenTelemetry Collector you use.
   */
  temporalityPreference?:
    | AggregationTemporalityPreference
    | AggregationTemporality;

  /**
   * Optional build info to be added to the `build_info` metric.
   */
  buildInfo?: BuildInfo;
};

/**
 * Initializes and registers the OTLP over HTTP exporter for Autometrics.
 */
export function init({
  url,
  headers,
  pushInterval = 5000,
  concurrencyLimit,
  timeout = 1000,
  temporalityPreference = AggregationTemporality.CUMULATIVE,
  buildInfo,
}: InitOptions) {
  amLogger.info(`Exporter will push to the OTLP/HTTP endpoint at ${url}`);

  const exporter = new OTLPMetricExporter({
    url,
    headers,
    concurrencyLimit,
    keepAlive: true,
    temporalityPreference,
  });

  if (pushInterval > 0) {
    registerExporterInternal({
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

    registerExporterInternal({
      metricReader,
      metricsRecorded: () => metricReader.forceFlush(),
    });
  } else {
    throw new Error(`Invalid pushInterval: ${pushInterval}`);
  }

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}
