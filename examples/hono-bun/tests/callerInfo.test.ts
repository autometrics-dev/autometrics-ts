import { expect, test } from "bun:test";

import { autometrics } from "@autometrics/autometrics";

import { collectAndSerialize, testWithMetricReader } from "./test-utils.js";

test("Caller info test -- synchronous call", async () => {
  await testWithMetricReader(async (metricReader) => {
    const foo = autometrics(function foo() {});

    const bar = autometrics(function bar() {
      foo();
    });

    bar();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(
      /function_calls_total\{\S*function="bar"\S*caller_function=""\S*\} 1/gm,
    );
    expect(serialized).toMatch(
      /function_calls_total\{\S*function="foo"\S*caller_function="bar"\S*caller_module="\/tests\/callerInfo.test.ts"\S*\} 1/gm,
    );
  });
});

test("Caller info test -- asynchronous call", async () => {
  await testWithMetricReader(async (metricReader) => {
    const foo = autometrics(function foo() {
      return Promise.resolve();
    });

    const bar = autometrics(async function bar() {
      await foo();
    });

    await bar();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(
      /function_calls_total\{\S*function="bar"\S*caller_function=""\S*\} 1/gm,
    );
    expect(serialized).toMatch(
      /function_calls_total\{\S*function="foo"\S*caller_function="bar"\S*caller_module="\/tests\/callerInfo.test.ts"\S*\} 1/gm,
    );
  });
});
