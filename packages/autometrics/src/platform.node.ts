// NOTE: Node type definitions are not installed on purpose to prevent
// accidental usage outside this file. As a result, there's quite a few
// @ts-ignore statements in this file...

import { AsyncLocalStorage } from "node:async_hooks";

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
 * Returns a new `AsyncLocalStorage` instance for storing caller information.
 *
 * @internal
 */
export function getALSInstance() {
  return new AsyncLocalStorage<{ caller?: string }>();
}
