import {
  BindOnceFuture,
  ExportResult,
  ExportResultCode,
} from "npm:@opentelemetry/core@^1.17.0";
import {
  AggregationTemporality,
  InstrumentType,
  PushMetricExporter,
  ResourceMetrics,
} from "npm:@opentelemetry/sdk-metrics@^1.17.0";

import { amLogger } from "../../mod.ts";
import { PrometheusSerializer } from "../exporter-prometheus/PrometheusSerializer.ts";
import type { InitOptions } from "./mod.ts";

const serializer = new PrometheusSerializer();

type PushGatewayExporterOptions = Pick<
  InitOptions,
  "url" | "headers" | "concurrencyLimit"
>;

export class PushGatewayExporter implements PushMetricExporter {
  private _concurrencyLimit: number;
  private _sendingPromises: Array<Promise<unknown>> = [];
  private _shutdownOnce: BindOnceFuture<void>;

  constructor(private _options: PushGatewayExporterOptions) {
    this._concurrencyLimit = _options.concurrencyLimit ?? Infinity;
    this._shutdownOnce = new BindOnceFuture(this._shutdown, this);

    this.shutdown = this.shutdown.bind(this);

    if ("addEventListener" in globalThis) {
      globalThis.addEventListener("unload", this.shutdown);
    }
  }

  export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void,
  ) {
    if (this._shutdownOnce.isCalled) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error("Exporter has been shutdown"),
      });
      return;
    }

    if (this._sendingPromises.length >= this._concurrencyLimit) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error("Concurrent export limit reached"),
      });
      return;
    }

    const serializedMetrics = serializer.serialize(metrics);

    this._export(serializedMetrics)
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((error: Error) => {
        resultCallback({ code: ExportResultCode.FAILED, error });
      });
  }

  private _export(serializedMetrics: string): Promise<void> {
    const promise = fetch(this._options.url, {
      method: "POST",
      mode: "cors",
      body: serializedMetrics,
      headers: this._options.headers,
      keepalive: true,
    });

    this._sendingPromises.push(promise);
    return promise
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not push metrics: ${response.statusText}`);
        }
      })
      .finally(() => {
        const index = this._sendingPromises.indexOf(promise);
        this._sendingPromises.splice(index, 1);
      });
  }

  forceFlush(): Promise<void> {
    return Promise.all(this._sendingPromises).then(() => {});
  }

  selectAggregationTemporality(
    _instrumentType: InstrumentType,
  ): AggregationTemporality {
    return AggregationTemporality.DELTA;
  }

  shutdown(): Promise<void> {
    if ("removeEventListener" in globalThis) {
      globalThis.removeEventListener("unload", this.shutdown);
    }

    return this._shutdownOnce.call();
  }

  // Called by `_shutdownOnce` with `BindOnceFuture`.
  private _shutdown(): Promise<void> {
    amLogger.debug("shutdown started");
    return this.forceFlush();
  }
}
