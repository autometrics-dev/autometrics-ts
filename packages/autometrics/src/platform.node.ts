/**
 * Returns the version of the application, based on environment variables.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  const env = getEnv();
  return (
    env.npm_package_version || env.PACKAGE_VERSION || env.AUTOMETRICS_VERSION
  );
}

/**
 * Returns the commit hash of the current build of the application, based on
 * environment variables.
 *
 * @internal
 */
export function getCommit(): string | undefined {
  const env = getEnv();
  return env.COMMIT_SHA || env.AUTOMETRICS_COMMIT;
}

/**
 * Returns the branch of the current build of the application, based on
 * environment variables.
 *
 * @internal
 */
export function getBranch(): string | undefined {
  const env = getEnv();
  return env.BRANCH_NAME || env.AUTOMETRICS_BRANCH;
}

/**
 * Returns the current working directory for the process we're running in.
 *
 * @internal
 */
export function getCwd(): string {
  // @ts-ignore Node type definitions are not installed on purpose to prevent
  // accidental usage outside this file.
  return ("process" in globalThis && process.cwd?.()) || "";
}

function getEnv(): Record<string, string> {
  // @ts-ignore Node type definitions are not installed on purpose to prevent
  // accidental usage outside this file.
  return ("process" in globalThis && process.env) || {};
}
