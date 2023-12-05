import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MetricData,
  MetricReader,
  PeriodicExportingMetricReader,
} from "$otel/sdk-metrics";

import { autometrics, registerExporter } from "../mod.ts";
import { COUNTER_NAME } from "../src/constants.ts";
import {
  AggregationTemporalityPreference,
  init,
} from "../src/exporter-otlp-http/mod.ts";
import { metricReader } from "../src/exporter-otlp-http/registerExporterInternal.ts";
import { PrometheusSerializer } from "../src/exporter-prometheus/PrometheusSerializer.ts";

export async function collectAndSerialize(metricReader: MetricReader) {
  const response = await metricReader.collect();

  return new PrometheusSerializer().serialize(response.resourceMetrics);
}

export async function stepWithMetricReader(
  t: Deno.TestContext,
  stepName: string,
  testFn: (reader: MetricReader) => Promise<void>,
) {
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(AggregationTemporality.DELTA),
  });

  registerExporter({ metricReader });

  try {
    await t.step(stepName, () => testFn(metricReader));
  } finally {
    await metricReader.forceFlush();
    await metricReader.shutdown();
  }
}

export function testWithTemporality({
  temporalityPreference,
  pushInterval,
  assertBeforePush,
  assertAfterPush,
}: {
  temporalityPreference: AggregationTemporalityPreference;
  pushInterval: number;
  assertBeforePush: (data: MetricData | undefined) => void;
  assertAfterPush: (data: MetricData | undefined) => void;
}) {
  const port = 4317;
  const url = `http://localhost:${port}/v1/metrics`;

  return async () => {
    // We need a real endpoint to submit to, or the OTLP exporter will keep on
    // retrying, which may mess with other tests.
    const serverController = new AbortController();
    const { signal } = serverController;
    const server = Deno.serve({ port, signal }, () => new Response("ok"));

    const timeout = 10;

    init({ url, pushInterval, temporalityPreference, timeout });

    if (!metricReader) {
      throw new Error("No metric reader defined");
    }

    const foo = autometrics(function foo() {});
    foo(); // record metric

    const collectionResultBeforePush = await metricReader.collect();

    const counterMetricBeforePush =
      collectionResultBeforePush?.resourceMetrics.scopeMetrics[0].metrics.find(
        (metric) => metric.descriptor.name === COUNTER_NAME,
      );

    assertBeforePush(counterMetricBeforePush);

    await new Promise((resolve) => setTimeout(resolve, pushInterval + timeout));

    const collectionResultAfterPush = await metricReader.collect();

    const counterMetricAfterPush =
      collectionResultAfterPush?.resourceMetrics.scopeMetrics[0].metrics.find(
        (metric) => metric.descriptor.name === COUNTER_NAME,
      );

    assertAfterPush(counterMetricAfterPush);

    await metricReader.forceFlush();
    await metricReader.shutdown();

    serverController.abort();

    await server.finished;
  };
}
