import {
  AggregationTemporality,
  InstrumentType,
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
  PushMetricExporter,
  ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import {
  BuildInfo,
  amLogger,
  createDefaultBuildInfo,
  createDefaultHistogramView,
  recordBuildInfo,
  registerExporter,
} from "@autometrics/autometrics";
import type { ExportResult } from "@opentelemetry/core";
import { OnDemandMetricReader } from "@autometrics/on-demand-metric-reader";
import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";

const serializer = new PrometheusSerializer();

export type InitOptions = {
  /**
   * The full URL (including http://) of the aggregating push gateway for
   * metrics to be submitted to.
   */
  url: string;

  /**
   * Optional headers to send along to the push gateway.
   */
  headers?: HeadersInit;

  /**
   * The interval for pushing metrics, in milliseconds (default: 5000ms).
   *
   * Set to `0` to push eagerly without batching metrics. This is mainly useful
   * for edge functions and some client-side scenarios.
   */
  pushInterval?: number;

  /**
   * The timeout for pushing metrics, in milliseconds (default: `30_000ms`).
   */
  timeout?: number;

  /**
   * Optional build info to be added to the `build_info` metric (necessary for
   * client-side applications).
   *
   * See {@link BuildInfo}
   */
  buildInfo?: BuildInfo;
};

/**
 * Initializes and registers the Push Gateway exporter for Autometrics.
 */
export function init({
  url,
  headers,
  pushInterval = 5_000,
  timeout = 30_000,
  buildInfo,
}: InitOptions) {
  if (typeof fetch === "undefined") {
    amLogger.warn(
      "Fetch is undefined, cannot push metrics to gateway. Consider adding a global polyfill.",
    );
    return;
  }

  amLogger.info(`Exporter will push to the Prometheus push gateway at ${url}`);

  const exporter = new PushGatewayExporter({ url, headers });

  const meterProvider = new MeterProvider({
    views: [createDefaultHistogramView()],
  });

  const shouldEagerlyPush = pushInterval === 0;

  let metricReader: MetricReader;
  if (pushInterval > 0) {
    metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: pushInterval,
      exportTimeoutMillis: timeout,
    });
  } else if (shouldEagerlyPush) {
    amLogger.debug("Configuring Autometrics to push metrics eagerly");

    metricReader = new OnDemandMetricReader({
      exporter,
      exportTimeoutMillis: timeout,
    });
  } else {
    throw new Error(`Invalid pushInterval: ${pushInterval}`);
  }

  meterProvider.addMetricReader(metricReader);

  registerExporter({
    getMeter: (name = "autometrics-otlp-http") => meterProvider.getMeter(name),
    metricsRecorded: shouldEagerlyPush
      ? () => metricReader.forceFlush()
      : undefined,
  });

  recordBuildInfo(buildInfo ?? createDefaultBuildInfo());
}

type PushGatewayExporterOptions = Pick<InitOptions, "url" | "headers">;

class PushGatewayExporter implements PushMetricExporter {
  private _shutdown = false;

  constructor(private _options: PushGatewayExporterOptions) {}

  export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void,
  ) {
    // TODO
  }

  forceFlush(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  selectAggregationTemporality(
    _instrumentType: InstrumentType,
  ): AggregationTemporality {
    return AggregationTemporality.DELTA;
  }

  shutdown(): Promise<void> {
    this._shutdown = true;
    return Promise.resolve();
  }
}

// TODO - allow custom fetch function to be passed in
// TODO - allow configuration of timeout for fetch
async function pushToGateway(
  metricReader: PeriodicExportingMetricReader,
  url: string,
  headers?: HeadersInit,
) {
  let serializedMetrics;
  try {
    const { resourceMetrics } = await metricReader.collect();
    serializedMetrics = serializer.serialize(resourceMetrics);
  } catch (error) {
    amLogger.trace("Error collecting metrics for push: ", error);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      body: serializedMetrics,
      headers,
      keepalive: true,
    });
    if (!response.ok) {
      amLogger.warn(`Error pushing metrics to gateway: ${response.statusText}`);
    }
  } catch (fetchError) {
    amLogger.trace("Error pushing metrics to gateway: ", fetchError);
  }

  try {
    // we flush the metrics at the end of the submission
    // to ensure the data is not repeated
    await metricReader.forceFlush();
  } catch (error) {
    amLogger.trace("Error flushing metrics after push: ", error);
  }
}
