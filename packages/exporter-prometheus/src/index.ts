import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  recordBuildInfo,
  registerExporter,
} from "@autometrics/autometrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

export type InitOptions = {
  /**
   * Optional build info to be added to the `build_info` metric.
   */
  buildInfo?: BuildInfo;

  /**
   * Port on which to open the Prometheus scrape endpoint (default: 9464).
   */
  port?: number;
};

/**
 * Initializes and registers the Prometheus exporter for Autometrics.
 *
 * This opens up a webserver with the `/metrics` endpoint, to be scraped by
 * Prometheus.
 */
export function init({ buildInfo, port = 9464 }: InitOptions = {}) {
  amLogger.info(`Opening a Prometheus scrape endpoint at port ${port}`);

  registerExporter({ metricReader: new PrometheusExporter({ port }) });

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}
