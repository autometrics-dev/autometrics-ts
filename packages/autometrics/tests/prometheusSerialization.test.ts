import { assertMatch, assertRejects } from "$std/assert/mod.ts";

import { autometrics } from "../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Prometheus serialization tests", async (t) => {
  await stepWithMetricReader(t, "single function", async (metricReader) => {
    const helloWorldFn = autometrics(function helloWorld() {});

    helloWorldFn();
    helloWorldFn();

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/autometrics\/tests\/prometheusSerialization.test.ts"\S*\} 2/gm,
    );
    assertMatch(
      serialized,
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/autometrics\/tests\/prometheusSerialization.test.ts"\S*\}/gm,
    );
  });

  await stepWithMetricReader(
    t,
    "single function that throws",
    async (metricReader) => {
      const errorFn = autometrics(function error() {
        return Promise.reject("Oh no");
      });

      await assertRejects(errorFn);

      const serialized = await collectAndSerialize(metricReader);

      assertMatch(
        serialized,
        /function_calls_total\{\S*function="error"\S*result="error"\S*\} 1/gm,
      );
    },
  );
});
