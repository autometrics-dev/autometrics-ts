import { expect, test } from "bun:test";

import { autometrics } from "@autometrics/autometrics";

import { collectAndSerialize, testWithMetricReader } from "./test-utils.js";

test("Caller info test", async () => {
  await testWithMetricReader(async (metricReader) => {
    const foo = autometrics(function foo() {});

    const bar = autometrics(function bar() {
      foo();
    });

    bar();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(
      /function_calls_total\{\S*function="bar"\S*caller=""\S*\} 1/gm,
    );
    expect(serialized).toMatch(
      /function_calls_total\{\S*function="foo"\S*caller="bar"\S*\} 1/gm,
    );
  });
});
