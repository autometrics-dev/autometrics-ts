import {
  PrometheusExporter,
  PrometheusSerializer,
} from "@opentelemetry/exporter-prometheus";
import {
  InMemoryMetricExporter,
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";

import { InitOptions, getInitConfigFromEnv, mergeInitOptions } from "./config";

let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

/**
 * Optional initialization function to set a custom exporter or push gateway for client-side applications.
 * Required if using autometrics in a client-side application.
 *
 * @param {InitOptions} options
 */
export function init(options: InitOptions) {
  // Read options from the environment and merge with the options supplied to this function
  // The options supplied to this function take precedence
  options = mergeInitOptions(getInitConfigFromEnv(), options);

  logger("Using the user's Exporter configuration");
  exporter = options.exporter;
  // if a pushGateway is added we overwrite the exporter
  if (options.pushGateway) {
    exporter = new PeriodicExportingMetricReader({
      // 0 - using delta aggregation temporality setting
      // to ensure data submitted to the gateway is accurate
      exporter: new InMemoryMetricExporter(0),
    });
    // Make sure the provider is initialized and exporter is registered
    getMetricsProvider();
    setInterval(
      () => pushToGateway(options.pushGateway),
      options.pushInterval ?? 5000,
    );
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
