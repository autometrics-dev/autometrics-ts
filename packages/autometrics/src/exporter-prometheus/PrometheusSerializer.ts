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

import type { AttributeValue, Attributes } from "$otel/api";
import { hrTimeToMilliseconds } from "$otel/core";
import type { IResource } from "$otel/resources";
import {
  DataPoint,
  DataPointType,
  Histogram,
  InstrumentType,
  MetricData,
  ResourceMetrics,
  ScopeMetrics,
} from "$otel/sdk-metrics";

import { amLogger } from "../../mod.ts";

type PrometheusDataTypeLiteral =
  | "counter"
  | "gauge"
  | "histogram"
  | "summary"
  | "untyped";

function escapeString(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

/**
 * String Attribute values are converted directly to Prometheus attribute values.
 * Non-string values are represented as JSON-encoded strings.
 *
 * `undefined` is converted to an empty string.
 */
function escapeAttributeValue(str: AttributeValue = "") {
  const string = typeof str === "string" ? str : JSON.stringify(str);
  return escapeString(string).replace(/"/g, '\\"');
}

const invalidCharacterRegex = /[^a-z0-9_]/gi;
const multipleUnderscoreRegex = /_{2,}/g;

/**
 * Ensures metric names are valid Prometheus metric names by removing
 * characters allowed by OpenTelemetry but disallowed by Prometheus.
 *
 * https://prometheus.io/docs/concepts/data_model/#metric-names-and-attributes
 *
 * 1. Names must match `[a-zA-Z_:][a-zA-Z0-9_:]*`
 *
 * 2. Colons are reserved for user defined recording rules.
 * They should not be used by exporters or direct instrumentation.
 *
 * OpenTelemetry metric names are already validated in the Meter when they are created,
 * and they match the format `[a-zA-Z][a-zA-Z0-9_.\-]*` which is very close to a valid
 * prometheus metric name, so we only need to strip characters valid in OpenTelemetry
 * but not valid in prometheus and replace them with '_'.
 *
 * @param name name to be sanitized
 */
function sanitizePrometheusMetricName(name: string): string {
  // replace all invalid characters with '_'
  return name
    .replace(invalidCharacterRegex, "_")
    .replace(multipleUnderscoreRegex, "_");
}

/**
 * @private
 *
 * Helper method which assists in enforcing the naming conventions for metric
 * names in Prometheus
 * @param name the name of the metric
 * @param type the kind of metric
 * @returns string
 */
function enforcePrometheusNamingConvention(
  name: string,
  type: InstrumentType,
): string {
  // Prometheus requires that metrics of the Counter kind have "_total" suffix
  if (!name.endsWith("_total") && type === InstrumentType.COUNTER) {
    return `${name}_total`;
  }

  return name;
}

function valueString(value: number) {
  if (Number.isNaN(value)) {
    return "NaN";
  }

  if (!Number.isFinite(value)) {
    return value < 0 ? "-Inf" : "+Inf";
  }

  return `${value}`;
}

function toPrometheusType(metricData: MetricData): PrometheusDataTypeLiteral {
  switch (metricData.dataPointType) {
    case DataPointType.SUM:
      if (metricData.isMonotonic) {
        return "counter";
      }
      return "gauge";
    case DataPointType.GAUGE:
      return "gauge";
    case DataPointType.HISTOGRAM:
      return "histogram";
    default:
      return "untyped";
  }
}

function stringify(
  metricName: string,
  attributes: Attributes,
  value: number,
  timestamp?: number,
  additionalAttributes?: Attributes,
) {
  let attributesStr = "";

  for (const [key, val] of Object.entries(attributes)) {
    const sanitizedAttributeName = sanitizePrometheusMetricName(key);
    attributesStr += `${
      attributesStr.length > 0 ? "," : ""
    }${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
  }
  if (additionalAttributes) {
    for (const [key, val] of Object.entries(additionalAttributes)) {
      const sanitizedAttributeName = sanitizePrometheusMetricName(key);
      attributesStr += `${
        attributesStr.length > 0 ? "," : ""
      }${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
    }
  }

  return `${metricName}${
    attributesStr ? `{${attributesStr}}` : ""
  } ${valueString(value)}${timestamp !== undefined ? ` ${timestamp}` : ""}\n`;
}

const NO_REGISTERED_METRICS = "# no registered metrics";

export class PrometheusSerializer {
  private _prefix: string | undefined;
  private _appendTimestamp: boolean;

  constructor(prefix?: string, appendTimestamp = false) {
    if (prefix) {
      this._prefix = `${prefix}_`;
    }
    this._appendTimestamp = appendTimestamp;
  }

  serialize(resourceMetrics: ResourceMetrics): string {
    let str = "";

    for (const scopeMetrics of resourceMetrics.scopeMetrics) {
      str += this._serializeScopeMetrics(scopeMetrics);
    }

    if (str === "") {
      str += NO_REGISTERED_METRICS;
    }

    return this._serializeResource(resourceMetrics.resource) + str;
  }

  private _serializeScopeMetrics(scopeMetrics: ScopeMetrics) {
    let str = "";
    for (const metric of scopeMetrics.metrics) {
      str += `${this._serializeMetricData(metric)}\n`;
    }
    return str;
  }

  private _serializeMetricData(metricData: MetricData) {
    let name = sanitizePrometheusMetricName(
      escapeString(metricData.descriptor.name),
    );
    if (this._prefix) {
      name = `${this._prefix}${name}`;
    }
    const dataPointType = metricData.dataPointType;

    name = enforcePrometheusNamingConvention(name, metricData.descriptor.type);

    const help = `# HELP ${name} ${escapeString(
      metricData.descriptor.description || "description missing",
    )}`;
    const unit = metricData.descriptor.unit
      ? `\n# UNIT ${name} ${escapeString(metricData.descriptor.unit)}`
      : "";
    const type = `# TYPE ${name} ${toPrometheusType(metricData)}`;

    let results = "";
    switch (dataPointType) {
      case DataPointType.SUM:
      case DataPointType.GAUGE: {
        results = metricData.dataPoints
          .map((it) =>
            this._serializeSingularDataPoint(
              name,
              metricData.descriptor.type,
              it,
            ),
          )
          .join("");
        break;
      }
      case DataPointType.HISTOGRAM: {
        results = metricData.dataPoints
          .map((it) =>
            this._serializeHistogramDataPoint(
              name,
              metricData.descriptor.type,
              it,
            ),
          )
          .join("");
        break;
      }
      default: {
        amLogger.warn(
          `Unrecognizable DataPointType: ${dataPointType} for metric "${name}"`,
        );
      }
    }

    return `${help}${unit}\n${type}\n${results}`.trim();
  }

  private _serializeSingularDataPoint(
    name: string,
    type: InstrumentType,
    dataPoint: DataPoint<number>,
  ): string {
    let results = "";

    const prometheusName = enforcePrometheusNamingConvention(name, type);
    const { value, attributes } = dataPoint;
    const timestamp = hrTimeToMilliseconds(dataPoint.endTime);
    results += stringify(
      prometheusName,
      attributes,
      value,
      this._appendTimestamp ? timestamp : undefined,
      undefined,
    );
    return results;
  }

  private _serializeHistogramDataPoint(
    name: string,
    type: InstrumentType,
    dataPoint: DataPoint<Histogram>,
  ): string {
    let results = "";

    const prometheusName = enforcePrometheusNamingConvention(name, type);
    const attributes = dataPoint.attributes;
    const histogram = dataPoint.value;
    const timestamp = hrTimeToMilliseconds(dataPoint.endTime);
    /** Histogram["bucket"] is not typed with `number` */
    for (const key of ["count", "sum"] as ("count" | "sum")[]) {
      const value = histogram[key];
      if (value != null)
        results += stringify(
          `${prometheusName}_${key}`,
          attributes,
          value,
          this._appendTimestamp ? timestamp : undefined,
          undefined,
        );
    }

    let cumulativeSum = 0;
    const countEntries = histogram.buckets.counts.entries();
    let infiniteBoundaryDefined = false;
    for (const [idx, val] of countEntries) {
      cumulativeSum += val;
      const upperBound = histogram.buckets.boundaries[idx];
      /** HistogramAggregator is producing different boundary output -
       * in one case not including infinity values, in other -
       * full, e.g. [0, 100] and [0, 100, Infinity]
       * we should consider that in export, if Infinity is defined, use it
       * as boundary
       */
      if (upperBound === undefined && infiniteBoundaryDefined) {
        break;
      }
      if (upperBound === Infinity) {
        infiniteBoundaryDefined = true;
      }
      results += stringify(
        `${prometheusName}_bucket`,
        attributes,
        cumulativeSum,
        this._appendTimestamp ? timestamp : undefined,
        {
          le:
            upperBound === undefined || upperBound === Infinity
              ? "+Inf"
              : String(upperBound),
        },
      );
    }

    return results;
  }

  protected _serializeResource(resource: IResource): string {
    const name = "target_info";
    const help = `# HELP ${name} Target metadata`;
    const type = `# TYPE ${name} gauge`;

    const results = stringify(name, resource.attributes, 1).trim();
    return `${help}\n${type}\n${results}\n`;
  }
}
