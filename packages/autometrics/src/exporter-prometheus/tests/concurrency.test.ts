import { assertMatch } from "../../tests/deps.ts";
import { autometrics } from "../../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "./util.ts";

Deno.test("Autometrics concurrency tests", async (t) => {
  await stepWithMetricReader(
    t,
    "increases and decreases the concurrency gauge",
    async (metricReader) => {
      const sleepFn = autometrics(
        { trackConcurrency: true },
        function sleep(ms: number) {
          return new Promise((resolve) => setTimeout(resolve, ms));
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
    },
  );
});
