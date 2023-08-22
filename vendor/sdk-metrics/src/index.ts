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

export type {
  Sum,
  LastValue,
  Histogram,
  ExponentialHistogram,
} from './aggregator/types.ts';

export type {
  AggregationSelector,
  AggregationTemporalitySelector,
} from './export/AggregationSelector.ts';

export { AggregationTemporality } from './export/AggregationTemporality.ts';

export {
  type DataPoint,
  DataPointType,
  type SumMetricData,
  type GaugeMetricData,
  type HistogramMetricData,
  type ExponentialHistogramMetricData,
  type ResourceMetrics,
  type ScopeMetrics,
  type MetricData,
  type CollectionResult,
} from './export/MetricData.ts';

export type { PushMetricExporter } from './export/MetricExporter.ts';

export { MetricReader, type MetricReaderOptions } from './export/MetricReader.ts';

export {
  PeriodicExportingMetricReader,
  type PeriodicExportingMetricReaderOptions,
} from './export/PeriodicExportingMetricReader.ts';

export { InMemoryMetricExporter } from './export/InMemoryMetricExporter.ts';

export { ConsoleMetricExporter } from './export/ConsoleMetricExporter.ts';

export type { MetricCollectOptions, MetricProducer } from './export/MetricProducer.ts';

export { type InstrumentDescriptor, InstrumentType } from './InstrumentDescriptor.ts';

export { MeterProvider, type MeterProviderOptions } from './MeterProvider.ts';

export {
  DefaultAggregation,
  ExplicitBucketHistogramAggregation,
  ExponentialHistogramAggregation,
  DropAggregation,
  HistogramAggregation,
  LastValueAggregation,
  SumAggregation,
  Aggregation,
} from './view/Aggregation.ts';

export { View, type ViewOptions } from './view/View.ts';

export { TimeoutError } from './utils.ts';
