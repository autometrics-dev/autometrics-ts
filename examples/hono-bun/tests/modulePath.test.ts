import { expect, test } from "bun:test";

import { autometrics } from "@autometrics/autometrics";

import { collectAndSerialize, testWithMetricReader } from "./test-utils.js";

test("Module path test", async () => {
  await testWithMetricReader(async (metricReader) => {
    const foo = autometrics(function foo() {});
    foo();
    foo();

    const serialized = await collectAndSerialize(metricReader);

    expect(serialized).toMatch(
      /function_calls_total\{\S*function="foo"\S*module="\/tests\/modulePath.test.ts"\S*\} 2/gm,
    );
  });
});
