import { assertStringIncludes } from "$std/assert/mod.ts";

import { recordBuildInfo } from "../mod.ts";
import {
  BRANCH_LABEL,
  COMMIT_LABEL,
  REPOSITORY_URL_LABEL,
  VERSION_LABEL,
} from "../src/constants.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Build info tests", async (t) => {
  await stepWithMetricReader(
    t,
    "build info is recorded",
    async (metricReader) => {
      recordBuildInfo({
        [VERSION_LABEL]: "1.0.1",
        [COMMIT_LABEL]: "123456789",
        [BRANCH_LABEL]: "main",
        [REPOSITORY_URL_LABEL]:
          "https://github.com/autometrics-dev/autometrics-ts.git",
      });

      const serialized = await collectAndSerialize(metricReader);

      assertStringIncludes(
        serialized,
        'build_info{autometrics_version="1.0.0",branch="main",commit="123456789",repository_provider="github",repository_url="https://github.com/autometrics-dev/autometrics-ts.git",version="1.0.1",clearmode=""}',
      );
    },
  );
});
