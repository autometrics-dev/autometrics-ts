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

import { HrTime } from "../../../opentelemetry-api/mod.ts";
import { Accumulation, Aggregator } from "../aggregator/types.ts";
import { InstrumentDescriptor } from "../InstrumentDescriptor.ts";
import { AttributesProcessor } from "../view/AttributesProcessor.ts";
import { MetricStorage } from "./MetricStorage.ts";
import { MetricData } from "../export/MetricData.ts";
import { DeltaMetricProcessor } from "./DeltaMetricProcessor.ts";
import { TemporalMetricProcessor } from "./TemporalMetricProcessor.ts";
import { Maybe } from "../utils.ts";
import { MetricCollectorHandle } from "./MetricCollector.ts";
import { AttributeHashMap } from "./HashMap.ts";
import { AsyncWritableMetricStorage } from "./WritableMetricStorage.ts";

/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for asynchronous instruments.
 */
export class AsyncMetricStorage<T extends Maybe<Accumulation>>
  extends MetricStorage
  implements AsyncWritableMetricStorage
{
  private _deltaMetricStorage: DeltaMetricProcessor<T>;
  private _temporalMetricStorage: TemporalMetricProcessor<T>;

  constructor(
    _instrumentDescriptor: InstrumentDescriptor,
    aggregator: Aggregator<T>,
    private _attributesProcessor: AttributesProcessor,
  ) {
    super(_instrumentDescriptor);
    this._deltaMetricStorage = new DeltaMetricProcessor(aggregator);
    this._temporalMetricStorage = new TemporalMetricProcessor(aggregator);
  }

  record(measurements: AttributeHashMap<number>, observationTime: HrTime) {
    const processed = new AttributeHashMap<number>();
    Array.from(measurements.entries()).forEach(([attributes, value]) => {
      processed.set(this._attributesProcessor.process(attributes), value);
    });
    this._deltaMetricStorage.batchCumulate(processed, observationTime);
  }

  /**
   * Collects the metrics from this storage. The ObservableCallback is invoked
   * during the collection.
   *
   * Note: This is a stateful operation and may reset any interval-related
   * state for the MetricCollector.
   */
  collect(
    collector: MetricCollectorHandle,
    collectors: MetricCollectorHandle[],
    collectionTime: HrTime,
  ): Maybe<MetricData> {
    const accumulations = this._deltaMetricStorage.collect();

    return this._temporalMetricStorage.buildMetrics(
      collector,
      collectors,
      this._instrumentDescriptor,
      accumulations,
      collectionTime,
    );
  }
}
