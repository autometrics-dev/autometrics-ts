import { assertMatch } from "../../tests/deps.ts";
import { collectAndSerialize, stepWithMetricReader } from "./util.ts";
import { recordBuildInfo } from "../../../mod.ts";

Deno.test("Autometrics build info tests", async (t) => {
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
