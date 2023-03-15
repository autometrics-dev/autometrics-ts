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

let autometricsMeterProvider: MeterProvider;
let exporter: MetricReader;

interface Exporter extends MetricReader {}

interface initOptions {
  exporter?: Exporter;
  pushGateway?: string;
  pushInterval?: number;
}

/**
 * Set your exporter. Required if used in the browser side
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
      exporter: new InMemoryMetricExporter(0),
    });
    // Make sure the provider is initialized and exporter is registered
    getMetricsProvider();
    setInterval(() => pushToGateway(options.pushGateway), options.pushInterval);
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

async function pushToGateway(gateway: string) {
  const exporterResponse = await exporter.collect();
  const metrics = exporterResponse.resourceMetrics;
  const serialized = new PrometheusSerializer().serialize(metrics);

  await fetch(`${gateway}/metrics`, {
    method: "POST",
    mode: "cors",
    body: serialized,
  });

  await exporter.forceFlush();
}

function logger(msg: string) {
  console.log(`Autometrics: ${msg}`);
}
