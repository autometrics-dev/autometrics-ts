import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
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
import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";

const serializer = new PrometheusSerializer();

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
  timeout = 30_000,
  buildInfo,
}: InitOptions) {
  amLogger.info(`Exporter will push to the Prometheus push gateway at ${url}`);

  // INVESTIGATE - Do we want a periodic exporter when we're pushing metrics eagerly?
  const metricReader = new PeriodicExportingMetricReader({
    // 0 - using delta aggregation temporality setting
    // to ensure data submitted to the gateway is accurate
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  const meterProvider = new MeterProvider({
    views: [createDefaultHistogramView()],
  });

  meterProvider.addMetricReader(metricReader);

  function pushMetrics() {
    amLogger.debug("Pushing metrics to gateway");
    pushToGateway(metricReader, url, headers);
  }

  const shouldEagerlyPush = pushInterval === 0;

  if (pushInterval > 0) {
    // TODO - add a way to stop the push interval
    setInterval(pushMetrics, pushInterval);
  } else if (shouldEagerlyPush) {
    amLogger.debug("Configuring autometrics to push metrics eagerly");
  } else {
    amLogger.trace(
      "Invalid pushInterval, metrics will not be pushed",
      pushInterval,
    );
  }

  registerExporter({
    getMeter: (name = "autometrics-push-gateway") =>
      meterProvider.getMeter(name),
    metricsRecorded: shouldEagerlyPush ? pushMetrics : undefined,
  });

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}

// TODO - allow custom fetch function to be passed in
// TODO - allow configuration of timeout for fetch
async function pushToGateway(
  metricReader: PeriodicExportingMetricReader,
  url: string,
  headers?: HeadersInit,
) {
  if (typeof fetch === "undefined") {
    amLogger.warn(
      "Fetch is undefined, cannot push metrics to gateway. Consider adding a global polyfill.",
    );
    return;
  }

  let serializedMetrics;
  try {
    const { resourceMetrics } = await metricReader.collect();
    serializedMetrics = serializer.serialize(resourceMetrics);
  } catch (error) {
    amLogger.trace("Error collecting metrics for push: ", error);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      body: serializedMetrics,
      headers,
      keepalive: true,
    });
    if (!response.ok) {
      amLogger.warn(`Error pushing metrics to gateway: ${response.statusText}`);
    }
  } catch (fetchError) {
    amLogger.trace("Error pushing metrics to gateway: ", fetchError);
  }

  try {
    // we flush the metrics at the end of the submission
    // to ensure the data is not repeated
    await metricReader.forceFlush();
  } catch (error) {
    amLogger.trace("Error flushing metrics after push: ", error);
  }
}
