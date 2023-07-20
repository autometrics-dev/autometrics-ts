import {
  PrometheusExporter,
  PrometheusSerializer,
} from "@opentelemetry/exporter-prometheus";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
  ExplicitBucketHistogramAggregation,
  View,
} from "@opentelemetry/sdk-metrics";
import { buildInfo, BuildInfo, recordBuildInfo } from "./buildInfo";
import { HISTOGRAM_NAME } from "./constants";

let IS_EAGERLY_PUSHED = false;
let _pushMetrics = () => {};
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
    exporter = new PeriodicExportingMetricReader({
      // 0 - using delta aggregation temporality setting
      // to ensure data submitted to the gateway is accurate
      exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
    });
    // Make sure the provider is initialized and exporter is registered
    getMetricsProvider();

    const interval = options.pushInterval ?? 5000;
    _pushMetrics = () => pushToGateway(options.pushGateway);

    if (interval > 0) {
      setInterval(_pushMetrics, interval);
    } else if (interval === 0) {
      logger("Configuring autometrics to push metrics eagerly");
      IS_EAGERLY_PUSHED = true;
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
  if (!IS_EAGERLY_PUSHED) {
    return;
  }

  if (exporter instanceof PeriodicExportingMetricReader) {
    logger("Pushing metrics to gateway");
    _pushMetrics();
  }
}

// TODO - add a way to stop the push interval
// TODO - handle errors
// TODO - allow configuration of timeout
// TODO - handle case when `fetch` is undefined
// TODO - allow custom fetch function to be passed in
async function pushToGateway(gateway: string) {
  const exporterResponse = await exporter.collect();
  console.log(
    "\n\n",
    require("util").inspect(exporterResponse, { depth: null }),
    "\n\n",
  );
  const serialized = new PrometheusSerializer().serialize(
    exporterResponse.resourceMetrics,
  );

  if (typeof fetch === "undefined") {
    logger("Fetch is undefined, cannot push metrics to gateway");
    return;
  }
  console.log("\n\n", serialized, "\n\n");

  try {
    const response = await fetch(gateway, {
      method: "POST",
      mode: "cors",
      body: serialized,
    });
    if (response.ok) {
      logger("OK response from gateway");
    } else {
      logger(`Error pushing metrics to gateway: ${response.statusText}`);
      logger(JSON.stringify(await response.text(), null, 2));
    }
  } catch (fetchError) {
    logger(
      `Error pushing metrics to gateway: ${
        fetchError?.message ?? "<no error message found>"
      }`,
    );
  }

  try {
    // we flush the metrics at the end of the submission to ensure the data is not repeated
    await exporter.forceFlush();
  } catch (error) {
    logger(
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
