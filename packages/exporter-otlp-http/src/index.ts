import {
  BuildInfo,
  amLogger,
  createDefaultHistogramView,
  recordBuildInfo,
  registerExporter,
} from "@autometrics/autometrics";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

export type InitOptions = {
  /**
   * Optional build info to be added to the `build_info` metric.
   */
  buildInfo?: BuildInfo;

  /**
   * Optional headers to send along to the OTLP endpoint.
   */
  headers?: Record<string, unknown>;

  /**
   * URL of the OpenTelemetry Collector to push metrics to.
   */
  url: string;
};

/**
 * Initializes and registers the OTLP over HTTP exporter for Autometrics.
 */
export function init({ buildInfo, url, headers }: InitOptions) {
  amLogger.info(`Exporting using the OLTP/HTTP endpoint at ${url}`);

  const meterProvider = new MeterProvider({
    views: [createDefaultHistogramView()],
  });

  const exporter = new OTLPMetricExporter({ url, headers });

  registerExporter({
    getMeter: (name = "autometrics-prometheus") => meterProvider.getMeter(name),
  });

  if (buildInfo) {
    amLogger.debug("Registering build info");
    recordBuildInfo(buildInfo);
  }
}
