import {
  BuildInfo,
  amLogger,
  createDefaultHistogramView,
  recordBuildInfo,
  registerExporter,
} from "@autometrics/autometrics";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

export type InitOptions = {
  /**
   * Optional build info to be added to the `build_info` metric.
   */
  buildInfo?: BuildInfo;

  /**
   * Port on which to open the Prometheus scrape endpoint (default: 4964).
   */
  port?: number;
};

/**
 * Initializes and registers the Prometheus exporter for Autometrics.
 *
 * This opens up a webserver with the `/metrics` endpoint, to be scraped by
 * Prometheus.
 */
export function init({ buildInfo, port }: InitOptions) {
  amLogger.info(`Opening a Prometheus scrape endpoint at port ${port}`);

  const meterProvider = new MeterProvider({
    views: [createDefaultHistogramView()],
  });

  meterProvider.addMetricReader(new PrometheusExporter({ port }));

  registerExporter({
    getMeter: (name = "autometrics-prometheus") => meterProvider.getMeter(name),
  });

  if (buildInfo) {
    amLogger.debug("Registering build info");
    recordBuildInfo(buildInfo);
  }
}
