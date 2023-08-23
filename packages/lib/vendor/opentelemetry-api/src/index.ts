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

export type { BaggageEntry, BaggageEntryMetadata, Baggage } from './baggage/types.ts';
export { baggageEntryMetadataFromString } from './baggage/utils.ts';
export type { Exception } from './common/Exception.ts';
export type { HrTime, TimeInput } from './common/Time.ts';
export type { Attributes, AttributeValue } from './common/Attributes.ts';

// Context APIs
export { createContextKey, ROOT_CONTEXT } from './context/context.ts';
export type { Context, ContextManager } from './context/types.ts';
export type { ContextAPI } from './api/context.ts';

// Diag APIs
export { DiagConsoleLogger } from './diag/consoleLogger.ts';
export {
  type DiagLogFunction,
  type DiagLogger,
  DiagLogLevel,
  type ComponentLoggerOptions,
  type DiagLoggerOptions,
} from './diag/types.ts';
export type { DiagAPI } from './api/diag.ts';

// Metrics APIs
export { createNoopMeter } from './metrics/NoopMeter.ts';
export type { MeterOptions, Meter } from './metrics/Meter.ts';
export type { MeterProvider } from './metrics/MeterProvider.ts';
export {
  ValueType,
  type Counter,
  type Histogram,
  type MetricOptions,
  type Observable,
  type ObservableCounter,
  type ObservableGauge,
  type ObservableUpDownCounter,
  type UpDownCounter,
  type BatchObservableCallback,
  type MetricAttributes,
  type MetricAttributeValue,
  type ObservableCallback,
} from './metrics/Metric.ts';
export type {
  BatchObservableResult,
  ObservableResult,
} from './metrics/ObservableResult.ts';
export type { MetricsAPI } from './api/metrics.ts';

// Propagation APIs
export {
  type TextMapPropagator,
  type TextMapSetter,
  type TextMapGetter,
  defaultTextMapGetter,
  defaultTextMapSetter,
} from './propagation/TextMapPropagator.ts';
export type { PropagationAPI } from './api/propagation.ts';

// Trace APIs
export type { SpanAttributes, SpanAttributeValue } from './trace/attributes.ts';
export type { Link } from './trace/link.ts';
export { ProxyTracer, type TracerDelegator } from './trace/ProxyTracer.ts';
export { ProxyTracerProvider } from './trace/ProxyTracerProvider.ts';
export type { Sampler } from './trace/Sampler.ts';
export { SamplingDecision, type SamplingResult } from './trace/SamplingResult.ts';
export type { SpanContext } from './trace/span_context.ts';
export { SpanKind } from './trace/span_kind.ts';
export type { Span } from './trace/span.ts';
export type { SpanOptions } from './trace/SpanOptions.ts';
export { type SpanStatus, SpanStatusCode } from './trace/status.ts';
export { TraceFlags } from './trace/trace_flags.ts';
export type { TraceState } from './trace/trace_state.ts';
export { createTraceState } from './trace/internal/utils.ts';
export type { TracerProvider } from './trace/tracer_provider.ts';
export type { Tracer } from './trace/tracer.ts';
export type { TracerOptions } from './trace/tracer_options.ts';
export {
  isSpanContextValid,
  isValidTraceId,
  isValidSpanId,
} from './trace/spancontext-utils.ts';
export {
  INVALID_SPANID,
  INVALID_TRACEID,
  INVALID_SPAN_CONTEXT,
} from './trace/invalid-span-constants.ts';
export type { TraceAPI } from './api/trace.ts';

// Split module-level variable definition into separate files to allow
// tree-shaking on each api instance.
import { context } from './context-api.ts';
import { diag } from './diag-api.ts';
import { metrics } from './metrics-api.ts';
import { propagation } from './propagation-api.ts';
import { trace } from './trace-api.ts';

// Named export.
export { context, diag, metrics, propagation, trace };
// Default export.
export default {
  context,
  diag,
  metrics,
  propagation,
  trace,
};
