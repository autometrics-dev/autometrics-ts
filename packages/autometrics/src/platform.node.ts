// NOTE: Node type definitions are not installed on purpose to prevent
// accidental usage outside this file. As a result, there's quite a few
// @ts-ignore statements in this file...

import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

import { AUTOMETRICS_DEFAULT_SERVICE_NAME } from "./constants.ts";
import { getGitRepositoryUrl, getPackageStringField } from "./platformUtils.ts";

/**
 * Returns the version of the application, based on environment variables.
 *
 * If no relevant environment variables are set, it attempts to use the version
 * from the closest `package.json` file.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  return (
    // @ts-ignore
    process.env.AUTOMETRICS_VERSION ??
    // @ts-ignore
    process.env.npm_package_version ??
    // @ts-ignore
    process.env.PACKAGE_VERSION ??
    detectPackageVersion()
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
 * Returns the service name based on environment variables.
 *
 * If no relevant environment variables are set, it attempts to use the version
 * from the closest `package.json` file.
 *
 * @internal
 */
export function getServiceName(): string {
  return (
    // @ts-ignore
    process.env.AUTOMETRICS_SERVICE_NAME ??
    // @ts-ignore
    process.env.OTEL_SERVICE_NAME ??
    detectPackageName() ??
    AUTOMETRICS_DEFAULT_SERVICE_NAME
  );
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

/**
 * Returns a boolean indicating whether a given path is the file-system root or not.
 *
 * @internal
 */
export function isRootPath(pathToCheck: string): boolean {
  return pathToCheck == parse(getCwd()).root;
}

function detectPackageName(): string | undefined {
  try {
    const gitConfig = readClosest("package.json");
    return getPackageStringField(gitConfig, "name");
  } catch {}
}

function detectPackageVersion(): string | undefined {
  try {
    const gitConfig = readClosest("package.json");
    return getPackageStringField(gitConfig, "version");
  } catch {}
}

function detectRepositoryUrl(): string | undefined {
  try {
    const gitConfig = readClosest(".git/config");
    return getGitRepositoryUrl(gitConfig);
  } catch {}
}

function readClosest(path: string): Uint8Array {
  let basePath = getCwd();
  while (basePath.length > 0) {
    try {
      return readFileSync(join(basePath, path));
    } catch {
      // Break once we've tried the file-system root
      if (isRootPath(basePath)) {
        break;
      }
      basePath = dirname(basePath);
    }
  }

  throw new Error(`Could not read ${path}`);
}
