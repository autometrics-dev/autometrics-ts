import { autometrics } from "../mod.ts";
import { assertMatch, assertRejects } from "./deps.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Integration tests", async (t) => {
  await stepWithMetricReader(t, "single function", async (metricReader) => {
    const helloWorldFn = autometrics(function helloWorld() {});

    helloWorldFn();
    helloWorldFn();

    const serialized = await collectAndSerialize(metricReader);

    assertMatch(
      serialized,
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/autometrics\/tests\/integration.test.ts"\S*\} 2/gm,
    );
    assertMatch(
      serialized,
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/autometrics\/tests\/integration.test.ts"\S*\}/gm,
    );
  });

  await stepWithMetricReader(
    t,
    "single function with throw",
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
