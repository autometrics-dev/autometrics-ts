/* Functions below template creation of relevant queries and encode them in URL */

const BUILD_INFO_LABELS =
  "* on (instance, job) group_left(version, commit) (last_over_time(build_info[1s]) or on (instance, job) up)";

export function createLatencyQuery(nodeIdentifier: string) {
  const latency = `sum by (le, function, module, commit, version) (rate(function_calls_duration_bucket{function="${nodeIdentifier}"}[5m]) ${BUILD_INFO_LABELS})`;
  return `histogram_quantile(0.99, ${latency}) or histogram_quantile(0.95, ${latency})`;
}

export function createRequestRateQuery(nodeIdentifier: string) {
  return `sum by (function, module, commit, version) (rate(function_calls_count_total{function="${nodeIdentifier}"}[5m]) ${BUILD_INFO_LABELS})`;
}

export function createErrorRatioQuery(nodeIdentifier: string) {
  const requestQuery = createRequestRateQuery(nodeIdentifier);
  return `sum by (function, module, commit, version) (rate(function_calls_count_total{function="${nodeIdentifier}",result="error"}[5m]) ${BUILD_INFO_LABELS}) / ${requestQuery}`;
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
