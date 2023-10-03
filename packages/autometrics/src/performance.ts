
const START = Date.now();

/**
 * Utility function for using the performance.now() function if it exists, otherwise
 * falls back to Date.now() - START, which has less precision but shouldn't matter for us.
 *
 * @note - This is required for compatibility with the Vercel Edge Function Runtime
 */
export function now() {
  if (hasPerformanceNow()) {
    return performance.now();
  }


  return Date.now() - START;
}

function hasPerformanceNow() {
  return typeof performance !== "undefined" && "now" in performance && typeof performance.now === "function";
}
