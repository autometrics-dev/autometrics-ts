import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  recordBuildInfo,
} from "@autometrics/autometrics";
import {
  AggregationTemporalityPreference,
  OTLPMetricExporter,
} from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

import { registerExporterInternal } from "./registerExporterInternal";

export { AggregationTemporalityPreference };

const MAX_SAFE_INTERVAL = 2 ** 31 - 1;

export type InitOptions = {
  /**
   * URL of the OpenTelemetry Collector to push metrics to. Should be a
   * complete url with port and `/v1/metrics` endpoint:
   * `http://localhost:4317/v1/metrics`.
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
   * The aggregation temporality preference.
   *
   * By default, we use `AggregationTemporality.CUMULATIVE`. You may wish to
   * change this depending on the setup you use.
   */
  temporalityPreference?: AggregationTemporalityPreference;

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
  temporalityPreference = AggregationTemporalityPreference.CUMULATIVE,
  buildInfo,
}: InitOptions) {
  amLogger.info(`Exporter will push to the OTLP/HTTP endpoint at ${url}`);

  const urlObj = new URL(url);

  if (!urlObj.pathname.endsWith("/v1/metrics")) {
    amLogger.warn(
      "The OTLP/HTTP endpoint path for metrics should be '/v1/metrics', your metrics data might not be submitted properly. See: https://opentelemetry.io/docs/specs/otel/protocol/exporter/#endpoint-urls-for-otlphttp",
    );
  }

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

    const metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: MAX_SAFE_INTERVAL,
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
