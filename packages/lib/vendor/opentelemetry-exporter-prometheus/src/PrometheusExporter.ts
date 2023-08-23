/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { diag } from "../../opentelemetry-api/mod.ts";
import { globalErrorHandler } from "../../opentelemetry-core/mod.ts";
import {
  Aggregation,
  AggregationTemporality,
  MetricReader,
} from "../../opentelemetry-sdk-metrics/mod.ts";
import { ExporterConfig } from "./export/types.ts";
import { PrometheusSerializer } from "./PrometheusSerializer.ts";

export class PrometheusExporter extends MetricReader {
  static readonly DEFAULT_OPTIONS = {
    host: undefined,
    port: 9464,
    endpoint: "/metrics",
    prefix: "",
    appendTimestamp: false,
  };

  private readonly _host?: string;
  private readonly _port: number;
  private readonly _baseUrl: string;
  private readonly _endpoint: string;
  private _server?: Deno.Server;
  private _serverAbort?: AbortController;
  private readonly _prefix?: string;
  private readonly _appendTimestamp: boolean;
  private _serializer: PrometheusSerializer;

  // This will be required when histogram is implemented. Leaving here so it is not forgotten
  // Histogram cannot have a attribute named 'le'
  // private static readonly RESERVED_HISTOGRAM_LABEL = 'le';

  /**
   * Constructor
   * @param config Exporter configuration
   * @param callback Callback to be called after a server was started
   */
  constructor(
    config: ExporterConfig = {},
    callback: (error: Error | void) => void = () => {},
  ) {
    super({
      aggregationSelector: (_instrumentType) => Aggregation.Default(),
      aggregationTemporalitySelector: (_instrumentType) =>
        AggregationTemporality.CUMULATIVE,
    });
    this._host =
      config.host ||
      Deno.env.get("OTEL_EXPORTER_PROMETHEUS_HOST") ||
      PrometheusExporter.DEFAULT_OPTIONS.host;
    this._port =
      config.port ||
      Number(Deno.env.get("OTEL_EXPORTER_PROMETHEUS_PORT")) ||
      PrometheusExporter.DEFAULT_OPTIONS.port;
    this._prefix = config.prefix || PrometheusExporter.DEFAULT_OPTIONS.prefix;
    this._appendTimestamp =
      typeof config.appendTimestamp === "boolean"
        ? config.appendTimestamp
        : PrometheusExporter.DEFAULT_OPTIONS.appendTimestamp;
    this._serializer = new PrometheusSerializer(
      this._prefix,
      this._appendTimestamp,
    );

    this._baseUrl = `http://${this._host}:${this._port}/`;
    this._endpoint = (
      config.endpoint || PrometheusExporter.DEFAULT_OPTIONS.endpoint
    ).replace(/^([^/])/, "/$1");

    if (config.preventServerStart !== true) {
      this.startServer().then(callback, (err) => {
        diag.error(err);
        callback(err);
      });
    } else if (callback) {
      callback();
    }
  }

  override async onForceFlush(): Promise<void> {
    /** do nothing */
  }

  /**
   * Shuts down the export server and clears the registry
   */
  override onShutdown(): Promise<void> {
    return this.stopServer();
  }

  /**
   * Stops the Prometheus export server
   */
  stopServer(): Promise<void> {
    if (!this._server) {
      diag.debug(
        "Prometheus stopServer() was called but server wasn't started.",
      );
      return Promise.resolve();
    } else {
      this._serverAbort?.abort();
      return this._server.finished
        .then(() => {
          this._server = undefined;
        })
        .catch(globalErrorHandler);
    }
  }

  /**
   * Starts the Prometheus export server
   */
  startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this._serverAbort = new AbortController();
        this._server = Deno.serve(
          {
            hostname: this._host,
            port: this._port,
            onListen: () => {
              diag.debug(
                `Prometheus exporter server started: ${this._host}:${this._port}/${this._endpoint}`,
              );
              resolve();
            },
            signal: this._serverAbort.signal,
          },
          this._requestHandler,
        );
        this._server.unref();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Creates a response for the current state of metrics.
   */
  public async getMetricsResponse(): Promise<Response> {
    try {
      const { resourceMetrics, errors } = await this.collect();
      if (errors.length) {
        diag.error("PrometheusExporter: metrics collection errors", ...errors);
      }

      return new Response(this._serializer.serialize(resourceMetrics), {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    } catch (error) {
      return new Response(`# failed to export metrics: ${error}`, {
        status: 500,
        headers: { "content-type": "text/plain" },
      });
    }
  }

  /**
   * Request handler used by http library to respond to incoming requests
   * for the current state of metrics by the Prometheus backend.
   *
   * @param request Incoming HTTP request to export server
   * @param response HTTP response object used to respond to request
   */
  private _requestHandler = (
    request: Request,
  ): Response | Promise<Response> => {
    if (
      request.url != null &&
      new URL(request.url, this._baseUrl).pathname === this._endpoint
    ) {
      return this.getMetricsResponse();
    } else {
      return this._notFound();
    }
  };

  /**
   * Responds with 404 status code to all requests that do not match the configured endpoint.
   */
  private _notFound(): Response {
    return new Response(null, { status: 404 });
  }
}
