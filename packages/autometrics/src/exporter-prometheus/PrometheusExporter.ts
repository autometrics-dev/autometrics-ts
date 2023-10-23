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

import {
  Aggregation,
  AggregationTemporality,
  MetricReader,
} from "npm:@opentelemetry/sdk-metrics@^1.17.0";

import { amLogger } from "../../mod.ts";
import { PrometheusSerializer } from "./PrometheusSerializer.ts";

const HEADERS = { "content-type": "text/plain" };

/**
 * Configuration interface for prometheus exporter
 */
export interface ExporterConfig {
  /**
   * Hostname or IP address on which to listen.
   */
  host: string;

  /**
   * Port number for Prometheus exporter server
   */
  port: number;
}

export class PrometheusExporter extends MetricReader {
  private readonly _abortController: AbortController;

  // This will be required when histogram is implemented. Leaving here so it is not forgotten
  // Histogram cannot have a attribute named 'le'
  // private static readonly RESERVED_HISTOGRAM_LABEL = 'le';

  /**
   * Constructor
   * @param config Exporter configuration
   */
  constructor({ port, host: hostname }: ExporterConfig) {
    super({
      aggregationSelector: (_instrumentType) => Aggregation.Default(),
      aggregationTemporalitySelector: (_instrumentType) =>
        AggregationTemporality.CUMULATIVE,
    });

    const serializer = new PrometheusSerializer();

    const onError = (err: unknown) => {
      amLogger.trace("Error in Prometheus trace exporter", err);
      return new Response("internal error", { status: 500 });
    };

    this._abortController = new AbortController();
    const { signal } = this._abortController;

    Deno.serve({ hostname, port, signal, onError }, async (request) => {
      if (new URL(request.url).pathname !== "/metrics") {
        return new Response("not found", { status: 404 });
      }

      try {
        const { resourceMetrics, errors } = await this.collect();
        if (errors.length) {
          amLogger.trace(
            "PrometheusExporter: metrics collection errors",
            ...errors,
          );
        }

        return new Response(serializer.serialize(resourceMetrics), {
          headers: HEADERS,
        });
      } catch (error) {
        return new Response(`# failed to export metrics: ${error}`, {
          headers: HEADERS,
        });
      }
    });

    amLogger.debug(
      `Prometheus exporter server started: ${hostname}:${port}/metrics`,
    );
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
    this._abortController.abort();
    return Promise.resolve();
  }
}
