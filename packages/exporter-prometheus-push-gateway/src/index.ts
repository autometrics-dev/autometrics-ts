import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BuildInfo,
  amLogger,
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
   * The interval for pushing metrics, in milliseconds (default: 5000ms).
   *
   * Set to `0` to push eagerly without batching metrics. This may be useful for
   * edge functions and some client-side scenarios.
   */
  pushInterval?: number;

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
export function init({ url, pushInterval = 5000, buildInfo }: InitOptions) {
  amLogger.info(`Exporting using the Prometheus push gateway at ${url}`);

  // INVESTIGATE - Do we want a periodic exporter when we're pushing metrics eagerly?
  const exporter = new PeriodicExportingMetricReader({
    // 0 - using delta aggregation temporality setting
    // to ensure data submitted to the gateway is accurate
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  const meterProvider = new MeterProvider({
    views: [createDefaultHistogramView()],
  });

  meterProvider.addMetricReader(exporter);

  function pushMetrics() {
    amLogger.debug("Pushing metrics to gateway");
    pushToGateway(exporter, url);
  }

  const shouldEagerlyPush = pushInterval === 0;

  if (pushInterval > 0) {
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

  if (buildInfo) {
    recordBuildInfo(buildInfo);
  }
}

// TODO - add a way to stop the push interval
// TODO - improve error logging
// TODO - allow custom fetch function to be passed in
// TODO - allow configuration of timeout for fetch
async function pushToGateway(
  exporter: PeriodicExportingMetricReader,
  url: string,
) {
  if (typeof fetch === "undefined") {
    amLogger.warn(
      "Fetch is undefined, cannot push metrics to gateway. Consider adding a global polyfill.",
    );
    return;
  }

  let serializedMetrics;
  try {
    const exporterResult = await exporter.collect();
    serializedMetrics = serializer.serialize(exporterResult.resourceMetrics);
  } catch (error) {
    amLogger.trace("Error collecting metrics for push: ", error);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      body: serializedMetrics,
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
    await exporter.forceFlush();
  } catch (error) {
    amLogger.trace("Error flushing metrics after push: ", error);
  }
}
