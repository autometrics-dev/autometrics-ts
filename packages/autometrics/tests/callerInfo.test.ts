import { assertMatch } from "$std/assert/mod.ts";

import { autometrics } from "../src/wrappers.ts";

import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Caller info test", async (t) => {
  await stepWithMetricReader(
    t,
    "caller is tracked in synchronous call",
    async (metricReader) => {
      const foo = autometrics(function foo() {});

      const bar = autometrics(function bar() {
        foo();
      });

      bar();

      const serialized = await collectAndSerialize(metricReader);

      assertMatch(
        serialized,
        /function_calls_total\{\S*function="bar"\S*caller_function=""\S*\} 1/gm,
      );
      assertMatch(
        serialized,
        /function_calls_total\{\S*function="foo"\S*caller_function="bar"\S*caller_module="\/packages\/autometrics\/tests\/callerInfo.test.ts"\S*\} 1/gm,
      );
    },
  );

  await stepWithMetricReader(
    t,
    "caller is tracked in asynchronous call",
    async (metricReader) => {
      const foo = autometrics(function foo() {
        return Promise.resolve();
      });

      const bar = autometrics(async function bar() {
        await foo();
      });

      await bar();

      const serialized = await collectAndSerialize(metricReader);

      assertMatch(
        serialized,
        /function_calls_total\{\S*function="bar"\S*caller_function=""\S*\} 1/gm,
      );
      assertMatch(
        serialized,
        /function_calls_total\{\S*function="foo"\S*caller_function="bar"\S*caller_module="\/packages\/autometrics\/tests\/callerInfo.test.ts"\S*\} 1/gm,
      );
    },
  );
});
