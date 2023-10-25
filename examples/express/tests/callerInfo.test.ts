import assert from "node:assert";
import test from "node:test";

import { autometrics } from "@autometrics/autometrics";

import { collectAndSerialize, stepWithMetricReader } from "./test-utils.js";

test("Caller info test", async (t) => {
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

      assert.match(
        serialized,
        /function_calls_total\{\S*function="bar"\S*caller_function=""\S*\} 1/gm,
      );
      assert.match(
        serialized,
        /function_calls_total\{\S*function="foo"\S*caller_function="bar"\S*caller_module="\/dist\/tests\/callerInfo.test.js"\S*\} 1/gm,
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

      assert.match(
        serialized,
        /function_calls_total\{\S*function="bar"\S*caller_function=""\S*\} 1/gm,
      );
      assert.match(
        serialized,
        /function_calls_total\{\S*function="foo"\S*caller_function="bar"\S*caller_module="\/dist\/tests\/callerInfo.test.js"\S*\} 1/gm,
      );
    },
  );
});
