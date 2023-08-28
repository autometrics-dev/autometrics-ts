import {
  PrometheusExporter,
  PrometheusSerializer,
} from "@opentelemetry/exporter-prometheus";
import {
  AggregationTemporality,
  ExplicitBucketHistogramAggregation,
  InMemoryMetricExporter,
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
  View,
} from "@opentelemetry/sdk-metrics";
import {
  BuildInfo,
  HISTOGRAM_NAME,
  recordBuildInfo,
} from "@autometrics/autometrics";

let globalShouldEagerlyPush = false;
let pushMetrics = () => {};
let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

/**
 * @group Initialization API
 */
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
 * @param {InitOptions} options
 *
 * @group Initialization API
 */
export function init({ url, pushInterval = 5000, buildInfo }: InitOptions) {
  logger(`Exporting using the push gateway at ${url}`);

  // INVESTIGATE - Do we want a periodic exporter when we're pushing metrics eagerly?
  exporter = new PeriodicExportingMetricReader({
    // 0 - using delta aggregation temporality setting
    // to ensure data submitted to the gateway is accurate
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });
  // Make sure the provider is initialized and exporter is registered
  getMetricsProvider();

  pushMetrics = () => pushToGateway(url);

  if (pushInterval > 0) {
    setInterval(pushMetrics, pushInterval);
  } else if (pushInterval === 0) {
    logger("Configuring autometrics to push metrics eagerly");
    globalShouldEagerlyPush = true;
  } else {
    console.error("Invalid pushInterval, metrics will not be pushed");
  }

  // buildInfo is added to init function only for client-side applications
  // if it is provided - we register it
  if (buildInfo) {
    logger("Registering build info");
    recordBuildInfo(buildInfo); // record build info only after the exporter is initialized
  }
}

export function eagerlyPushMetricsIfConfigured() {
  if (!globalShouldEagerlyPush) {
    return;
  }

  if (exporter instanceof PeriodicExportingMetricReader) {
    logger("Pushing metrics to gateway");
    pushMetrics();
  }
}

// TODO - add a way to stop the push interval
// TODO - improve error logging
// TODO - allow custom fetch function to be passed in
// TODO - allow configuration of timeout for fetch
async function pushToGateway(gateway: string) {
  if (typeof fetch === "undefined") {
    console.error(
      "Fetch is undefined, cannot push metrics to gateway. Consider adding a global polyfill.",
    );
    return;
  }

  // Collect metrics
  // We return early if there was an error
  const exporterResponse = await safeCollect();
  if (exporterResponse === null) {
    return;
  }

  const serialized = new PrometheusSerializer().serialize(
    exporterResponse.resourceMetrics,
  );

  try {
    const response = await fetch(gateway, {
      method: "POST",
      mode: "cors",
      body: serialized,
    });
    if (!response.ok) {
      console.error(`Error pushing metrics to gateway: ${response.statusText}`);
      // NOTE - Uncomment to log the response body
      // console.error(JSON.stringify(await response.text(), null, 2));
    }
  } catch (fetchError) {
    console.error(
      `Error pushing metrics to gateway: ${
        fetchError?.message ?? "<no error message found>"
      }`,
    );
  }

  await safeFlush();
}

async function safeCollect() {
  try {
    return await exporter.collect();
  } catch (error) {
    console.error(
      `Error collecting metrics for push: ${
        error?.message ?? "<no error message found>"
      }`,
    );
    return null;
  }
}

async function safeFlush() {
  try {
    // we flush the metrics at the end of the submission to ensure the data is not repeated
    await exporter.forceFlush();
  } catch (error) {
    console.error(
      `Error flushing metrics after push: ${
        error?.message ?? "<no error message found>"
      }`,
    );
  }
}

/**
 * Instantiates an autometrics meter provider and default Prometheus exporter
 * if none exist)
 */
export function getMetricsProvider() {
  if (!autometricsMeterProvider) {
    if (!exporter) {
      logger(
        "Initiating a Prometheus Exporter on port: 9464, endpoint: /metrics",
      );
      exporter = new PrometheusExporter();
    }

    autometricsMeterProvider = new MeterProvider({
      views: [
        new View({
          // See: https://github.com/autometrics-dev/autometrics-ts/issues/102
          aggregation: new ExplicitBucketHistogramAggregation([
            0, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5,
            7.5, 10,
          ]),
          instrumentName: HISTOGRAM_NAME,
        }),
      ],
    });

    autometricsMeterProvider.addMetricReader(exporter);
  }

  return autometricsMeterProvider;
}

/**
 * Gets the instantiated autometrics meter
 */
export function getMeter(meter = "autometrics-prometheus") {
  return getMetricsProvider().getMeter(meter);
}

function logger(msg: string) {
  console.log(`Autometrics: ${msg}`);
}
