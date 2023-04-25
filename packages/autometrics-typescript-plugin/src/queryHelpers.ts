/* Functions below template creation of relevant queries and encode them in URL */

import type { NodeType } from "./types";

export function createLatencyQuery(nodeIdentifier: string, nodeType: string) {
  const latency = `sum by (le, function, module) (rate(${nodeType}_calls_duration_bucket{${nodeType}="${nodeIdentifier}"}[5m]))`;
  return `histogram_quantile(0.99, ${latency}) or histogram_quantile(0.95, ${latency})`;
}

export function createRequestRateQuery(
  nodeIdentifier: string,
  nodeType: NodeType,
) {
  return `sum by (function, module) (rate(${nodeType}_calls_count_total{${nodeType}="${nodeIdentifier}"}[5m]))`;
}

export function createErrorRatioQuery(
  nodeIdentifier: string,
  nodeType: NodeType,
) {
  const requestQuery = createRequestRateQuery(nodeIdentifier, nodeType);
  return `sum by (function, module) (rate(${nodeType}_calls_count_total{${nodeType}="${nodeIdentifier}",result="error"}[5m])) / ${requestQuery}`;
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
