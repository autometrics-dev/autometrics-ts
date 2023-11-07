import { MetricReader } from "$otel/sdk-metrics";

import {
  BuildInfo,
  amLogger,
  recordBuildInfo,
  registerExporter,
} from "../../mod.ts";
import { PrometheusExporter } from "./PrometheusExporter.ts";

let metricReader: MetricReader | undefined;

export type InitOptions = {
  /**
   * Optional build info to be added to the `build_info` metric.
   */
  buildInfo?: BuildInfo;

  /**
   * Hostname or IP address on which to listen.
   *
   * @default '0.0.0.0'
   */
  hostname?: string;

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
export function init({
  buildInfo = {},
  hostname = "0.0.0.0",
  port = 9464,
}: InitOptions = {}) {
  if (metricReader) {
    throw new Error(
      "Prometheus exporter is already running. You might have called `init()` " +
        "more than once.",
    );
  }

  amLogger.info(`Opening a Prometheus scrape endpoint at port ${port}`);

  metricReader = new PrometheusExporter({ host: hostname, port });
  registerExporter({ metricReader });

  recordBuildInfo(buildInfo);
}

/**
 * Stops the built-in Prometheus exporter.
 */
export async function stop() {
  if (metricReader) {
    await metricReader.shutdown();
    metricReader = undefined;
  } else {
    amLogger.warn("Prometheus exporter already stopped or never started");
  }
}
