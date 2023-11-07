// NOTE: Node type definitions are not installed on purpose to prevent
// accidental usage outside this file. As a result, there's quite a few
// @ts-ignore statements in this file...

import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";

import { getGitRepositoryUrl } from "./platformUtils.ts";

/**
 * Returns the version of the application, based on environment variables.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  return (
    // @ts-ignore
    process.env.AUTOMETRICS_VERSION ||
    // @ts-ignore
    process.env.npm_package_version ||
    // @ts-ignore
    process.env.PACKAGE_VERSION
  );
}

/**
 * Returns the commit hash of the current build of the application, based on
 * environment variables.
 *
 * @internal
 */
export function getCommit(): string | undefined {
  // @ts-ignore
  return process.env.AUTOMETRICS_COMMIT || process.env.COMMIT_SHA;
}

/**
 * Returns the branch of the current build of the application, based on
 * environment variables.
 *
 * @internal
 */
export function getBranch(): string | undefined {
  // @ts-ignore
  return process.env.AUTOMETRICS_BRANCH || process.env.BRANCH_NAME;
}

/**
 * Returns the current working directory for the process we're running in.
 *
 * @internal
 */
export function getCwd(): string {
  // @ts-ignore
  return process.cwd();
}

/**
 * Returns the URL to the repository where the project's source code is located.
 *
 * @internal
 */
export function getRepositoryUrl(): string | undefined {
  // @ts-ignore
  return process.env.AUTOMETRICS_REPOSITORY_URL ?? detectRepositoryUrl();
}

/**
 * Returns a hint as to which provider is being used to host the repository.
 *
 * @internal
 */
export function getRepositoryProvider(): string | undefined {
  // @ts-ignore
  return process.env.AUTOMETRICS_REPOSITORY_PROVIDER;
}

/**
 * Returns a new `AsyncLocalStorage` instance for storing caller information.
 *
 * @internal
 */
export function getALSInstance() {
  return new AsyncLocalStorage<{
    callerFunction?: string;
    callerModule?: string;
  }>();
}

function detectRepositoryUrl(): string | undefined {
  try {
    const gitConfig = readFileSync(".git/config");
    return getGitRepositoryUrl(gitConfig);
  } catch {}
}
