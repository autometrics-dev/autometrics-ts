import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import {
  ExplicitBucketHistogramAggregation,
  MeterProvider,
  MetricReader,
  View,
} from "@opentelemetry/sdk-metrics";
import {
  BuildInfo,
  HISTOGRAM_NAME,
  recordBuildInfo,
} from "@autometrics/autometrics";

let port = 4964;

let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

/**
 * @group Initialization API
 */
export type InitOptions = {
  /**
   * Optional build info to be added to the build_info metric (necessary for
   * client-side applications).
   *
   * See {@link BuildInfo}
   */
  buildInfo?: BuildInfo;

  /**
   * Port on which to open the Prometheus scrape endpoint (default: 4964).
   */
  port?: number;
};

/**
 * Optional initialization function to set a custom exporter or push gateway for client-side applications.
 * Required if using autometrics in a client-side application. See {@link InitOptions} for details.
 *
 * @param {InitOptions} options
 * @group Initialization API
 */
export function init({ buildInfo, port: _port }: InitOptions) {
  if (_port !== undefined) {
    port = _port;
  }

  logger(`Opening a Prometheus scrape endpoint at port ${port}`);

  // buildInfo is added to init function only for client-side applications
  // if it is provided - we register it
  if (buildInfo) {
    logger("Registering build info");
    recordBuildInfo(buildInfo); // record build info only after the exporter is initialized
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
        `Initiating a Prometheus Exporter on port: ${port}, endpoint: /metrics`,
      );
      exporter = new PrometheusExporter({ port });
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
