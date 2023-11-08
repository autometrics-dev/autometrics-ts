import { assertStringIncludes } from "$std/assert/mod.ts";

import { recordBuildInfo } from "../../mod.ts";
import { collectAndSerialize, stepWithMetricReader } from "../testUtils.ts";

Deno.test("Build info tests", async (t) => {
  // Create a temporary directory with a `.git/config` and `package.json` to
  // test the auto-detected defaults.
  const cwd = Deno.cwd();
  const path = Deno.makeTempDirSync({ prefix: "defaultBuildInfo-test" });
  Deno.mkdirSync(`${path}/.git`);
  Deno.writeFileSync(
    `${path}/.git/config`,
    new TextEncoder().encode(`[core]
  repositoryformatversion = 0
  filemode = true
  bare = false
  logallrefupdates = true
[remote "origin"]
  url = git@github.com:autometrics-dev/autometrics-tests.git
  fetch = +refs/heads/*:refs/remotes/origin/*`),
  );
  Deno.writeFileSync(
    `${path}/package.json`,
    new TextEncoder().encode(`{
    "name": "autometrics-defaultBuildInfo-test",
    "version": "0.1.0-test"
}`),
  );
  Deno.chdir(path);

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
          'repository_url="git@github.com:autometrics-dev/autometrics-tests.git",' +
          'repository_provider="github",' +
          'service_name="autometrics-defaultBuildInfo-test",' +
          'version="0.1.0-test",' +
          'clearmode=""}',
      );
    },
  );

  Deno.chdir(cwd);
  Deno.removeSync(path, { recursive: true });
});
