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

/**
 * If you have a Prometheus exporter already set up, this function allows you to
 * get autometrics to use the same exporter
 *
 * @param 'userExporter' {T extends MetricReader}
 */
export function setMetricsExporter<T extends MetricReader>(
  userExporter?: T,
  pushTarget?: string,
  interval?: number,
) {
  logger("Using the user's Exporter configuration");
  exporter = userExporter;
  if (pushTarget && interval) {
		exporter = new PeriodicExportingMetricReader({
			exporter: new InMemoryMetricExporter(0)
		})
    setInterval(() => pushToGateway(pushTarget), interval * 1000);
  }
  return;
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

async function pushToGateway(gateway: string) {
  const exporterResponse = await exporter.collect();
  const metrics = exporterResponse.resourceMetrics;
  const serialized = new PrometheusSerializer().serialize(metrics);

  const res = await fetch(`http://${gateway}/metrics/`, {
    method: "POST",
    mode: "cors",
    body: serialized,
  });

  console.log(res);

  await exporter.forceFlush();
}
