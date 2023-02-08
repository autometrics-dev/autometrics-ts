/* Functions below template creation of relevant queries and encode them in URL */

export function createLatencyQuery(nodeIdentifier: string, nodeType: string) {
  const latency = `sum by (le, function, module) (rate(${nodeType}_calls_duration_bucket{${nodeType}="${nodeIdentifier}"}[5m]))`;
  return `histogram_quantile(0.99, ${latency}) or histogram_quantile(0.95, ${latency})`;
}

export function createRequestRateQuery(
  nodeIdentifier: string,
  nodeType: string,
) {
  return `sum by (function, module) (rate(${nodeType}_calls_count{${nodeType}="${nodeIdentifier}"}[5m]))`;
}

export function createErrorRatioQuery(
  nodeIdentifier: string,
  nodeType: string,
) {
  const requestQuery = createRequestRateQuery(nodeIdentifier, nodeType);
  return `sum by (function, module) (rate(${nodeType}_calls_count{${nodeType}="${nodeIdentifier}",result="error"}[5m])) / ${requestQuery}`;
}

const DEFAULT_URL = "http://localhost:9090/";
export function makePrometheusUrl(query: string, base = DEFAULT_URL) {
  return `${base && DEFAULT_URL}graph?g0.expr=${encodeURIComponent(query)}&g0.tab=0`;
}
