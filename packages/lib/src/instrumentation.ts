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
} from "@opentelemetry/sdk-metrics";
import { buildInfo, BuildInfo, recordBuildInfo } from "./buildInfo";

let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

type Exporter = MetricReader;

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

    setInterval(
      () => pushToGateway(options.pushGateway),
      options.pushInterval ?? 5000,
    );
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

async function pushToGateway(gateway: string) {
  const exporterResponse = await exporter.collect();
  const serialized = new PrometheusSerializer().serialize(
    exporterResponse.resourceMetrics,
  );

  await fetch(gateway, {
    method: "POST",
    mode: "cors",
    body: serialized,
  });
  // we flush the metrics at the end of the submission to ensure the data is not repeated
  await exporter.forceFlush();
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

    autometricsMeterProvider = new MeterProvider();
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
