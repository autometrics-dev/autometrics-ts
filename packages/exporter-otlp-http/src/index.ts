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
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

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
   * The interval for pushing metrics, in milliseconds (default: `5_000ms`).
   *
   * Set to `0` to push eagerly without batching metrics. This is mainly useful
   * for edge functions and some client-side scenarios.
   */
  pushInterval?: number;

  /**
   * The timeout for pushing metrics, in milliseconds (default: `30_000ms`).
   */
  timeout?: number;

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
  pushInterval = 5_000,
  timeout = 30_000,
  buildInfo,
}: InitOptions) {
  amLogger.info(`Exporter will push to the OLTP/HTTP endpoint at ${url}`);

  const exporter = new OTLPMetricExporter({ url, headers, keepAlive: true });

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
    getMeter: (name = "autometrics-otlp-http") => meterProvider.getMeter(name),
    metricsRecorded: shouldEagerlyPush
      ? () => metricReader.forceFlush()
      : undefined,
  });

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}
