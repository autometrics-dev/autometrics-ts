// Guard the call to `process.cwd()` so that the NPM build is usable in browsers
// too. We *don't* guard the accesses to `process.env` since bundlers commonly
// allow implementing replacements on that object.
const isNode =
  "process" in globalThis &&
  // @ts-ignore
  process &&
  // @ts-ignore
  "cwd" in process &&
  // @ts-ignore
  typeof process.cwd === "function";

export function getRootDir(): string {
  // @ts-ignore
  return isNode ? process.cwd() : "";
}

/**
 * Returns the version of the application.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  return (
    // @ts-ignore
    process.env.npm_package_version ||
    // @ts-ignore
    process.env.PACKAGE_VERSION ||
    // @ts-ignore
    process.env.AUTOMETRICS_VERSION
  );
}

/**
 * Returns the commit hash of the current state of the application.
 *
 * @internal
 */
export function getCommit(): string | undefined {
  // @ts-ignore
  return process.env.COMMIT_SHA || process.env.AUTOMETRICS_COMMIT;
}

/**
 * Returns the current branch of the application.
 *
 * @internal
 */
export function getBranch(): string | undefined {
  // @ts-ignore
  return process.env.BRANCH_NAME || process.env.AUTOMETRICS_BRANCH;
}
