import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Returns the version of the application, based on environment variables.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  return Deno.env.get("AUTOMETRICS_VERSION") || Deno.env.get("PACKAGE_VERSION");
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
