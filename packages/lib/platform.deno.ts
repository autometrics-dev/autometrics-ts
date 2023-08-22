// Guard all the calls to the `Deno` global so that the Deno build is usable
// in browsers too.
const isDeno =
  "Deno" in globalThis &&
  Deno &&
  "cwd" in Deno &&
  typeof Deno.cwd === "function";

export function getRootDir(): string {
  return isDeno ? Deno.cwd() : "";
}

/**
 * Returns the version of the application.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  if (isDeno) {
    return (
      Deno.env.get("AUTOMETRICS_VERSION") || Deno.env.get("PACKAGE_VERSION")
    );
  }
}

/**
 * Returns the commit hash of the current state of the application.
 *
 * @internal
 */
export function getCommit(): string | undefined {
  if (isDeno) {
    return Deno.env.get("COMMIT_SHA") || Deno.env.get("AUTOMETRICS_COMMIT");
  }
}

/**
 * Returns the current branch of the application.
 *
 * @internal
 */
export function getBranch(): string | undefined {
  if (isDeno) {
    return Deno.env.get("BRANCH_NAME") || Deno.env.get("AUTOMETRICS_BRANCH");
  }
}
