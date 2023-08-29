import type {
  Attributes,
  BatchObservableCallback,
  Context,
  Counter,
  Histogram,
  Meter,
  MetricOptions,
  Observable,
  ObservableCallback,
  ObservableCounter,
  ObservableGauge,
  ObservableUpDownCounter,
  UpDownCounter,
} from "@opentelemetry/api";

import type { Exporter } from "./exporter";
import {
  NoopCounterMetric,
  NoopHistogramMetric,
  NoopMeter,
  NoopObservableCounterMetric,
  NoopObservableGaugeMetric,
  NoopObservableUpDownCounterMetric,
} from "@opentelemetry/api/build/src/metrics/NoopMeter";
import { warn } from "./logger";

/**
 * Returns a temporary exporter that tracks metrics until the user has a chance
 * to register their own exporter. Once a custom exporter is registered, the
 * temporary exporter forwards the tracked metrics to the newly registered one
 * so that no metrics are lost during the window where no custom exporter was
 * registered.
 *
 * @internal
 */
export class TemporaryExporter implements Exporter, Meter {
  private _createdCounters: Array<TemporaryCounter<Attributes>> = [];
  private _createdHistograms: Array<TemporaryHistogram<Attributes>> = [];
  private _createdUpDownCounters: Array<TemporaryCounter<Attributes>> = [];
  private _createdObservableCounters: Array<TemporaryObservable<Attributes>> =
    [];
  private _createdObservableGauges: Array<TemporaryObservable<Attributes>> = [];
  private _createdObservableUpDownCounters: Array<
    TemporaryObservable<Attributes>
  > = [];
  private _registeredBatchObservableCallbacks: Array<RegisteredBatchObservableCallback> =
    [];

  createCounter<AttributesTypes extends Attributes = Attributes>(
    name: string,
    options?: MetricOptions,
  ): Counter<AttributesTypes> {
    if (!this._initTimer()) {
      return new NoopCounterMetric();
    }

    const counter = new TemporaryCounter(name, options);
    this._createdUpDownCounters.push(counter);
    return counter;
  }

  createHistogram<AttributesTypes extends Attributes = Attributes>(
    name: string,
    options?: MetricOptions,
  ): Histogram<AttributesTypes> {
    if (!this._initTimer()) {
      return new NoopHistogramMetric();
    }

    const histogram = new TemporaryHistogram(name, options);
    this._createdHistograms.push(histogram);
    return histogram;
  }

  createUpDownCounter<AttributesTypes extends Attributes = Attributes>(
    name: string,
    options?: MetricOptions,
  ): UpDownCounter<AttributesTypes> {
    if (!this._initTimer()) {
      return new NoopCounterMetric();
    }

    const upDownCounter = new TemporaryCounter(name, options);
    this._createdUpDownCounters.push(upDownCounter);
    return upDownCounter;
  }

  createObservableCounter<AttributesTypes extends Attributes = Attributes>(
    name: string,
    options?: MetricOptions,
  ): ObservableCounter<AttributesTypes> {
    if (!this._initTimer()) {
      return new NoopObservableCounterMetric();
    }

    const observableCounter = new TemporaryObservable(name, options);
    this._createdObservableCounters.push(observableCounter);
    return observableCounter;
  }

  createObservableGauge<AttributesTypes extends Attributes = Attributes>(
    name: string,
    options?: MetricOptions,
  ): ObservableGauge<AttributesTypes> {
    if (!this._initTimer()) {
      return new NoopObservableGaugeMetric();
    }

    const observableGauge = new TemporaryObservable(name, options);
    this._createdObservableGauges.push(observableGauge);
    return observableGauge;
  }

  createObservableUpDownCounter<
    AttributesTypes extends Attributes = Attributes,
  >(
    name: string,
    options?: MetricOptions,
  ): ObservableUpDownCounter<AttributesTypes> {
    if (!this._initTimer()) {
      return new NoopObservableUpDownCounterMetric();
    }

    const observableUpDownCounter = new TemporaryObservable(name, options);
    this._createdObservableUpDownCounters.push(observableUpDownCounter);
    return observableUpDownCounter;
  }

  addBatchObservableCallback<AttributesTypes extends Attributes = Attributes>(
    callback: BatchObservableCallback<AttributesTypes>,
    observables: Array<Observable<AttributesTypes>>,
  ): void {
    if (!this._initTimer()) {
      return;
    }

    const rboc: RegisteredBatchObservableCallback = [callback, observables];
    if (!this._registeredBatchObservableCallbacks.some(matchesRboc(rboc))) {
      this._registeredBatchObservableCallbacks.push(rboc);
    }
  }

  removeBatchObservableCallback<
    AttributesTypes extends Attributes = Attributes,
  >(
    callback: BatchObservableCallback<AttributesTypes>,
    observables: Array<Observable<AttributesTypes>>,
  ): void {
    const index = this._registeredBatchObservableCallbacks.findIndex(
      matchesRboc([callback, observables]),
    );
    if (index > -1) {
      this._registeredBatchObservableCallbacks.splice(index, 1);
    }
  }

  getMeter() {
    return this;
  }

  /**
   * Transfers all the metrics that have been registered thus far to a meter
   * from the newly registered exporter.
   *
   * Existing counters, histograms and observables will forward new metrics to
   * their newly created counterparts, as consumers might be holding on to the
   * instances created by the temporary exporter.
   *
   * @internal
   */
  handover(meter: Meter) {
    for (const counter of this._createdCounters) {
      counter.forward(meter.createCounter(counter.name, counter.options));
    }

    for (const histogram of this._createdHistograms) {
      histogram.forward(
        meter.createHistogram(histogram.name, histogram.options),
      );
    }

    for (const counter of this._createdUpDownCounters) {
      counter.forward(meter.createUpDownCounter(counter.name, counter.options));
    }

    for (const counter of this._createdObservableCounters) {
      counter.forward(
        meter.createObservableCounter(counter.name, counter.options),
      );
    }

    for (const gauge of this._createdObservableGauges) {
      gauge.forward(meter.createObservableGauge(gauge.name, gauge.options));
    }

    for (const counter of this._createdObservableUpDownCounters) {
      counter.forward(
        meter.createObservableGauge(counter.name, counter.options),
      );
    }

    for (const rboc of this._registeredBatchObservableCallbacks) {
      meter.addBatchObservableCallback(...rboc);
    }

    this._createdCounters = [];
    this._createdHistograms = [];
    this._createdUpDownCounters = [];
    this._createdObservableCounters = [];
    this._createdObservableGauges = [];
    this._createdObservableUpDownCounters = [];
    this._registeredBatchObservableCallbacks = [];
  }

  metricsRecorded() {}

  /**
   * Timer for setting a warning that is triggered when the temporary exporter
   * is being used for too long.
   *
   * The temporary exporter is only intended to bridge the moment between the
   * first metrics being collected and the user's exporter being registered. If
   * no user exporter is registered at all, it risks silently stuffing all the
   * metrics into an ever-growing, never-seen memory pool. To avoid the user
   * shooting themselves in the foot, we will log a warning if the timer expires
   * and stop the collecting of metrics when that happens.
   *
   * @internal
   */
  private _timer: ReturnType<typeof setTimeout> | false;

  /**
   * Initializes the timer after which the temporary exporter will stop
   * collecting metrics.
   *
   * Returns `false` if the timer has already expired.
   */
  private _initTimer(): boolean {
    if (this._timer === false) {
      return false;
    }

    this._timer ??= setTimeout(() => {
      // Empty the collected metrics into the noop meter.
      this.handover(new NoopMeter());

      this._timer = false;
      warn(
        "No metrics exporter was registered within 1 second. Metrics collection disabled.",
      );
    }, 1000);

    return true;
  }
}

type RegisteredBatchObservableCallback = [
  BatchObservableCallback<Attributes>,
  Array<Observable<Attributes>>,
];

function matchesRboc(
  rboc: RegisteredBatchObservableCallback,
): (other: RegisteredBatchObservableCallback) => boolean {
  return (other) => other[0] === rboc[0] && other[1] === rboc[1];
}

class TemporaryCounter<AttributesTypes extends Attributes = Attributes>
  implements Counter<AttributesTypes>, UpDownCounter<AttributesTypes>
{
  private _addedValues: Array<
    [number, AttributesTypes | undefined, Context | undefined]
  > = [];
  private _counter: Counter<AttributesTypes> | undefined;

  constructor(public name: string, public options?: MetricOptions) {}

  add(value: number, attributes?: AttributesTypes, context?: Context): void {
    if (this._counter) {
      this._counter.add(value, attributes, context);
    } else {
      this._addedValues.push([value, attributes, context]);
    }
  }

  forward(counter: Counter<AttributesTypes>) {
    for (const [value, attributes, context] of this._addedValues) {
      counter.add(value, attributes, context);
    }

    this._addedValues = [];
    this._counter = counter;
  }
}

class TemporaryHistogram<AttributesTypes extends Attributes = Attributes>
  implements Histogram<AttributesTypes>
{
  private _histogram: Histogram<AttributesTypes> | undefined;
  private _recordedValues: Array<
    [number, AttributesTypes | undefined, Context | undefined]
  > = [];

  constructor(public name: string, public options?: MetricOptions) {}

  record(value: number, attributes?: AttributesTypes, context?: Context): void {
    if (this._histogram) {
      this._histogram.record(value, attributes, context);
    } else {
      this._recordedValues.push([value, attributes, context]);
    }
  }

  forward(histogram: Histogram<AttributesTypes>) {
    for (const [value, attributes, context] of this._recordedValues) {
      histogram.record(value, attributes, context);
    }

    this._recordedValues = [];
    this._histogram = histogram;
  }
}

class TemporaryObservable<AttributesTypes extends Attributes = Attributes>
  implements
    ObservableCounter<AttributesTypes>,
    ObservableGauge<AttributesTypes>,
    ObservableUpDownCounter<AttributesTypes>
{
  private _listeners: Array<ObservableCallback<AttributesTypes>> = [];
  private _observable: Observable<AttributesTypes> | undefined;

  constructor(public name: string, public options?: MetricOptions) {}

  addCallback(callback: ObservableCallback<AttributesTypes>): void {
    if (this._observable) {
      this._observable.addCallback(callback);
    } else if (!this._listeners.includes(callback)) {
      this._listeners.push(callback);
    }
  }

  removeCallback(callback: ObservableCallback<AttributesTypes>): void {
    if (this._observable) {
      this._observable.removeCallback(callback);
    } else {
      const index = this._listeners.indexOf(callback);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    }
  }

  forward(observable: Observable<AttributesTypes>) {
    for (const listener of this._listeners) {
      observable.addCallback(listener);
    }

    this._listeners = [];
    this._observable = observable;
  }
}
