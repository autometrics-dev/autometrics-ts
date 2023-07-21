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
import { BuildInfo, buildInfo, recordBuildInfo } from "./buildInfo";
import { HISTOGRAM_NAME } from "./constants";

let globalShouldEagerlyPush = false;
let pushMetrics = () => {};
let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

type Exporter = MetricReader;

/**
 * @group Initialization API
 */
export type initOptions = {
  /**
   * A custom exporter to be used instead of the bundled Prometheus Exporter on port 9464
   */
  exporter?: Exporter;
  /**
   * The full URL (including http://) of the aggregating push gateway for metrics to be submitted to.
   */
  pushGateway?: string;
  /**
   * Set a custom push interval in ms (default: 5000ms)
   */
  pushInterval?: number;
  /**
   * Optional build info to be added to the build_info metric (necessary for client-side applications).
   *
   * See {@link BuildInfo}
   */
  buildInfo?: BuildInfo;
};

/**
 * Optional initialization function to set a custom exporter or push gateway for client-side applications.
 * Required if using autometrics in a client-side application. See {@link initOptions} for details.
 *
 * @param {initOptions} options
 * @group Initialization API
 */
export function init(options: initOptions) {
  logger("Using the user's Exporter configuration");
  exporter = options.exporter;
  // if a pushGateway is added we overwrite the exporter
  if (options.pushGateway) {
    // INVESTIGATE - Do we want a periodic exporter when we're pushing metrics eagerly?
    exporter = new PeriodicExportingMetricReader({
      // 0 - using delta aggregation temporality setting
      // to ensure data submitted to the gateway is accurate
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });
    // Make sure the provider is initialized and exporter is registered
    getMetricsProvider();

    const interval = options.pushInterval ?? 5000;
    pushMetrics = () => pushToGateway(options.pushGateway);

    if (interval > 0) {
      setInterval(pushMetrics, interval);
    } else if (interval === 0) {
      logger("Configuring autometrics to push metrics eagerly");
      globalShouldEagerlyPush = true;
    } else {
      console.error("Invalid pushInterval, metrics will not be pushed");
    }
  }

  // buildInfo is added to init function only for client-side applications
  // if it is provided - we register it
  if (options.buildInfo) {
    logger("Registering build info");
    buildInfo.version = options.buildInfo?.version;
    buildInfo.commit = options.buildInfo?.commit;
    buildInfo.branch = options.buildInfo?.branch;
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
            0,
            0.005,
            0.01,
            0.025,
            0.05,
            0.075,
            0.1,
            0.25,
            0.5,
            0.75,
            1,
            2.5,
            5,
            7.5,
            10,
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
