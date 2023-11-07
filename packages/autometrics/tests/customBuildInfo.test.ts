import { assertMatch, assertStringIncludes } from "$std/assert/mod.ts";

import { autometrics, recordBuildInfo } from "../mod.ts";
import {
  BRANCH_LABEL,
  COMMIT_LABEL,
  REPOSITORY_URL_LABEL,
  SERVICE_NAME_LABEL,
  VERSION_LABEL,
} from "../src/constants.ts";
import { collectAndSerialize, stepWithMetricReader } from "./testUtils.ts";

Deno.test("Build info tests", async (t) => {
  await stepWithMetricReader(
    t,
    "custom build info is recorded",
    async (metricReader) => {
      recordBuildInfo({
        [BRANCH_LABEL]: "main",
        [COMMIT_LABEL]: "123456789",
        [REPOSITORY_URL_LABEL]: "https://gitlab.com/arendjr/autometrics-ts.git",
        [SERVICE_NAME_LABEL]: "buildInfo-test",
        [VERSION_LABEL]: "1.0.1",
        clearmode: "aggregate",
      });

      const foo = autometrics(function foo() {});
      foo();

      const serialized = await collectAndSerialize(metricReader);

      assertStringIncludes(
        serialized,
        "build_info{" +
          'autometrics_version="1.0.0",' +
          'branch="main",' +
          'commit="123456789",' +
          'repository_provider="gitlab",' +
          'repository_url="https://gitlab.com/arendjr/autometrics-ts.git",' +
          'service_name="buildInfo-test",' +
          'version="1.0.1",' +
          'clearmode="aggregate"}',
      );

      // Verify service name is included in function metrics too:
      assertMatch(
        serialized,
        /function_calls_total\{\S*function="foo"\S*service_name="buildInfo-test"\S*\} 1/gm,
      );
    },
  );
});
