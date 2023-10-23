/**
 * On web, environment variables don't exist, so we return an empty string.
 *
 * @internal
 */
export function getVersion(): string | undefined {
  return "";
}

/**
 * On web, environment variables don't exist, so we return an empty string.
 *
 * @internal
 */
export function getCommit(): string | undefined {
  return "";
}

/**
 * On web, environment variables don't exist, so we return an empty string.
 *
 * @internal
 */
export function getBranch(): string | undefined {
  return "";
}

/**
 * On web, there's no concept of a working directory, so we return an empty
 * string.
 *
 * @internal
 */
export function getCwd(): string {
  return "";
}

/**
 * `AsyncLocalStorage` is not supported on web, so we don't return anything.
 *
 * TODO: We should keep an eye on https://github.com/tc39/proposal-async-context
 * to see if or when similar functionality gets supported on web.
 */
export function getALSInstance() {}
