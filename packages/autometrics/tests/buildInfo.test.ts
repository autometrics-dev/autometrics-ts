import { assertMatch } from "$std/assert/mod.ts";

import { recordBuildInfo } from "../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Build info tests", async (t) => {
  await stepWithMetricReader(
    t,
    "build info is recorded",
    async (metricReader) => {
      recordBuildInfo({
        version: "1.0.0",
        commit: "123456789",
        branch: "main",
      });

      const serialized = await collectAndSerialize(metricReader);

      assertMatch(
        serialized,
        /build_info{version="1.0.0",commit="123456789",branch="main",clearmode=""}/gm,
      );
    },
  );
});
