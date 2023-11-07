import { dirname, join } from "$std/path/mod.ts";

import { AsyncLocalStorage } from "node:async_hooks";

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
    Deno.env.get("AUTOMETRICS_VERSION") ??
    Deno.env.get("PACKAGE_VERSION") ??
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
  return Deno.env.get("AUTOMETRICS_COMMIT");
}

/**
 * Returns the branch of the current build of the application, based on
 * environment variables.
 *
 * @internal
 */
export function getBranch(): string | undefined {
  return Deno.env.get("AUTOMETRICS_BRANCH");
}

/**
 * Returns the current working directory for the process we're running in.
 *
 * @internal
 */
export function getCwd(): string {
  return Deno.cwd();
}

/**
 * Returns the URL to the repository where the project's source code is located.
 *
 * @internal
 */
export function getRepositoryUrl(): string | undefined {
  return Deno.env.get("AUTOMETRICS_REPOSITORY_URL") ?? detectRepositoryUrl();
}

/**
 * Returns a hint as to which provider is being used to host the repository.
 *
 * @internal
 */
export function getRepositoryProvider(): string | undefined {
  return Deno.env.get("AUTOMETRICS_REPOSITORY_PROVIDER");
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
    Deno.env.get("AUTOMETRICS_SERVICE_NAME") ??
    Deno.env.get("OTEL_SERVICE_NAME") ??
    detectPackageName() ??
    AUTOMETRICS_DEFAULT_SERVICE_NAME
  );
}

/**
 * Caller information we track across async function calls.
 *
 * @internal
 */
export type AsyncContext = { callerFunction?: string; callerModule?: string };

/**
 * Returns a new `AsyncLocalStorage` instance for storing caller information.
 *
 * Note: We include `undefined` in the return type since the web version of
 * this function won't return anything. This way, we force ourselves to apply
 * guards whenever we call this function.
 *
 * @internal
 */
export function getALSInstance(): AsyncLocalStorage<AsyncContext> | undefined {
  return new AsyncLocalStorage<AsyncContext>();
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
      return Deno.readFileSync(join(basePath, path));
    } catch {
      basePath = dirname(basePath);
    }
  }

  throw new Error(`Could not read ${path}`);
}
