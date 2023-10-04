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
