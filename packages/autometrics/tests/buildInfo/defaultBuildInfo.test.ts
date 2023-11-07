import { assertStringIncludes } from "$std/assert/mod.ts";

import { recordBuildInfo } from "../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "../testUtils.ts";

Deno.test("Build info tests", async (t) => {
  await stepWithMetricReader(
    t,
    "default build info is recorded if none given",
    async (metricReader) => {
      recordBuildInfo({});

      const serialized = await collectAndSerialize(metricReader);

      assertStringIncludes(
        serialized,
        "build_info{" +
          'autometrics_version="1.0.0",' +
          'branch="",' +
          'commit="",' +
          'repository_provider="github",' +
          'repository_url="git@github.com:autometrics-dev/autometrics-ts.git",' +
          'service_name="autometrics-monorepo",' +
          'version="0.8.0-dev",' +
          'clearmode=""}',
      );
    },
  );
});
