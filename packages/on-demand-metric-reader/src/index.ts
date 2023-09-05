import * as api from "@opentelemetry/api";
import {
  internal,
  ExportResultCode,
  globalErrorHandler,
} from "@opentelemetry/core";
import {
  MetricReader,
  PushMetricExporter,
  TimeoutError,
} from "@opentelemetry/sdk-metrics";

export type OnDemandMetricReaderOptions = {
  /**
   * The backing exporter for the metric reader.
   */
  exporter: PushMetricExporter;

  /**
   * Milliseconds for the async observable callback to timeout.
   */
  exportTimeoutMillis?: number;
};

/**
 * {@link MetricReader} which collects metrics based on a user-configurable time
 * interval, and passes the metrics to the configured {@link PushMetricExporter}
 */
export class OnDemandMetricReader extends MetricReader {
  private _exporter: PushMetricExporter;
  private readonly _exportTimeout: number;

  constructor({
    exporter,
    exportTimeoutMillis = 30000,
  }: OnDemandMetricReaderOptions) {
    super({
      aggregationSelector: exporter.selectAggregation?.bind(exporter),
      aggregationTemporalitySelector:
        exporter.selectAggregationTemporality?.bind(exporter),
    });

    if (exportTimeoutMillis <= 0) {
      throw Error("exportTimeoutMillis must be greater than 0");
    }

    this._exporter = exporter;
    this._exportTimeout = exportTimeoutMillis;
  }

  private async _runOnce(): Promise<void> {
    try {
      await callWithTimeout(this._doRun(), this._exportTimeout);
    } catch (err) {
      if (err instanceof TimeoutError) {
        api.diag.error(
          "Export took longer than %s milliseconds and timed out.",
          this._exportTimeout,
        );
        return;
      }

      globalErrorHandler(err as api.Exception);
    }
  }

  private async _doRun(): Promise<void> {
    const { resourceMetrics, errors } = await this.collect({
      timeoutMillis: this._exportTimeout,
    });

    if (errors.length > 0) {
      api.diag.error(
        "OnDemandMetricReader: metrics collection errors",
        ...errors,
      );
    }

    const doExport = async () => {
      const result = await internal._export(this._exporter, resourceMetrics);
      if (result.code !== ExportResultCode.SUCCESS) {
        throw new Error(
          `OnDemandMetricReader: metrics export failed (error ${result.error})`,
        );
      }
    };

    // Avoid scheduling a promise to make the behavior more predictable and easier to test
    if (resourceMetrics.resource.asyncAttributesPending) {
      resourceMetrics.resource
        .waitForAsyncAttributes?.()
        .then(doExport, (err) =>
          api.diag.debug(
            "Error while resolving async portion of resource: ",
            err,
          ),
        );
    } else {
      await doExport();
    }
  }

  protected override onInitialized(): void {}

  protected async onForceFlush(): Promise<void> {
    await this._runOnce();
    await this._exporter.forceFlush();
  }

  protected async onShutdown(): Promise<void> {
    await this._exporter.shutdown();
  }
}

function callWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>(function timeoutFunction(
    _resolve,
    reject,
  ) {
    timeoutHandle = setTimeout(function timeoutHandler() {
      reject(new TimeoutError("Operation timed out."));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}
