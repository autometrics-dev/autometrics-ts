import { assertMatch } from "$std/assert/mod.ts";

import { autometrics } from "../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Concurrency tests", async (t) => {
  await stepWithMetricReader(
    t,
    "increases and decreases the concurrency gauge",
    async (metricReader) => {
      const timeouts: Array<ReturnType<typeof setTimeout>> = [];

      const sleepFn = autometrics(
        { trackConcurrency: true },
        function sleep(ms: number) {
          return new Promise((resolve) => {
            const timeout = setTimeout(resolve, ms);
            timeouts.push(timeout);
            return timeout;
          });
        },
      );

      const one = sleepFn(1000);
      const two = sleepFn(1000);
      const _three = sleepFn(20000);

      await Promise.all([one, two]);

      const serialized = await collectAndSerialize(metricReader);

      assertMatch(
        serialized,
        /function_calls_concurrent\{\S*function="sleep"\S*\} 1/gm,
      );

      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    },
  );
});
