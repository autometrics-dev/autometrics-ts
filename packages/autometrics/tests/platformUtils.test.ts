import { assertEquals } from "$std/assert/mod.ts";

import {
  getGitRepositoryUrl,
  getPackageStringField,
} from "../src/platformUtils.ts";

Deno.test("Platform utils tests", async (t) => {
  await t.step("extracts Git URL", () => {
    assertEquals(
      getGitRepositoryUrl(
        new TextEncoder().encode(
          `[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
    logallrefupdates = true
[remote "origin"]
    url = git@github.com:autometrics-dev/autometrics-ts.git
    fetch = +refs/heads/*:refs/remotes/origin/*`,
        ),
      ),
      "git@github.com:autometrics-dev/autometrics-ts.git",
    );
  });

  await t.step("extracts quoted Git URL", () => {
    assertEquals(
      getGitRepositoryUrl(
        new TextEncoder().encode(
          `[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
    logallrefupdates = true
[remote "origin"]
    url = "git@github.com:autometrics-dev/autometrics-ts.git"
    fetch = +refs/heads/*:refs/remotes/origin/*`,
        ),
      ),
      "git@github.com:autometrics-dev/autometrics-ts.git",
    );
  });

  await t.step("doesn't return upstream URL", () => {
    assertEquals(
      getGitRepositoryUrl(
        new TextEncoder().encode(
          `[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
    logallrefupdates = true
[remote "upstream"]
    url = git@github.com:autometrics-dev/autometrics-ts.git
    fetch = +refs/heads/*:refs/remotes/origin/*
[remote "origin"]
    url = git@github.com:arendjr/autometrics-ts.git
    fetch = +refs/heads/*:refs/remotes/origin/*`,
        ),
      ),
      "git@github.com:arendjr/autometrics-ts.git",
    );
  });

  await t.step("doesn't return commented URL", () => {
    assertEquals(
      getGitRepositoryUrl(
        new TextEncoder().encode(
          `[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
    logallrefupdates = true
[remote "origin"]
    #url = git@github.com:autometrics-dev/autometrics-ts.git
    url = git@github.com:arendjr/autometrics-ts.git
    fetch = +refs/heads/*:refs/remotes/origin/*`,
        ),
      ),
      "git@github.com:arendjr/autometrics-ts.git",
    );
  });

  await t.step("extracts the package name", () => {
    assertEquals(
      getPackageStringField(
        new TextEncoder().encode(`{ "name": "autometrics-monorepo" }`),
        "name",
      ),
      "autometrics-monorepo",
    );
  });
});
