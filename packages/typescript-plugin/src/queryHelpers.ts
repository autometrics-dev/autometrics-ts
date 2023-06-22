/* Functions below template creation of relevant queries and encode them in URL */

type FunctionOrCaller = "function" | "caller";

const BUILD_INFO_LABELS =
  "* on (instance, job) group_left(version, commit) last_over_time(build_info[1s])";

export function createLatencyQuery(nodeIdentifier: string) {
  const latency = `sum by (le, function, module, commit, version) (rate(function_calls_duration_bucket{function="${nodeIdentifier}"}[5m]) ${BUILD_INFO_LABELS})`;
  return `label_replace(histogram_quantile(0.99, ${latency}), "percentile_latency", "99", "","")\nor\nlabel_replace(histogram_quantile(0.95, ${latency}), "percentile_latency", "95", "", "")`;
}

export function createRequestRateQuery(
  functionOrCaller: FunctionOrCaller,
  nodeIdentifier: string,
) {
  return `sum by (function, module, commit, version) (rate({__name__=~"function_calls(_count)?(_total)?",${functionOrCaller}="${nodeIdentifier}"}[5m]) ${BUILD_INFO_LABELS})`;
}

export function createErrorRatioQuery(
  functionOrCaller: FunctionOrCaller,
  nodeIdentifier: string,
) {
  const requestQuery = createRequestRateQuery(functionOrCaller, nodeIdentifier);
  return `(sum by (function, module, commit, version) (rate({__name__=~"function_calls(_count)?(_total)?",${functionOrCaller}="${nodeIdentifier}",result="error"}[5m]) ${BUILD_INFO_LABELS}))\n/\n(${requestQuery})`;
}

const DEFAULT_URL = "http://localhost:9090/";
export function makePrometheusUrl(query: string, base: string = DEFAULT_URL) {
  function createValidBaseUrl(url: string) {
    const regex = /\/$/;
    return regex.test(url) ? url : `${url}/`;
  }

  return `${createValidBaseUrl(base)}graph?g0.expr=${urlEncodeString(
    query,
  )}&g0.tab=0`;
}

// Utility to ensure that parens and other characters are encoded as well
//
//(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#encoding_for_rfc3986)
function urlEncodeString(str: string) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
