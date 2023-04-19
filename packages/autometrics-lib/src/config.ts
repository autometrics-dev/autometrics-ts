import { MetricReader } from "@opentelemetry/sdk-metrics";

type Exporter = MetricReader;

export type InitOptions = {
  /**
   * A custom exporter to be used instead of the bundled Prometheus Exporter on port 9464
   */
  exporter?: Exporter;
  /**
   * The full URL (including http://) of the aggregating push gateway for metrics to be submitted to.
   * Will override the exporter if provided.
   */
  pushGateway?: string;
  /**
   * Set a custom push interval in ms (default: 5000ms)
   */
  pushInterval?: number;
};

/**
 * Employ a "last-in-wins" strategy to merge two InitOptions objects.
 */
export function mergeInitOptions(
  envOptions: InitOptions,
  initFunctionOptions: InitOptions,
): InitOptions {
  return {
    ...envOptions,
    ...initFunctionOptions,
  };
}

/**
 * Safely read `pushGateway` and `pushInterval` initOptions from the environment.
 * If the environment variables are not set, returns an empty object.
 */
export function getInitConfigFromEnv(): InitOptions {
  let config: InitOptions = {};

  const pushGateway = getPushGatewayFromEnv();
  if (pushGateway) {
    config.pushGateway = pushGateway;
  }

  const pushInterval = parseInt(getPushGatewayIntervalFromEnv());
  if (!isNaN(pushInterval)) {
    config.pushInterval = pushInterval;
  }

  return config;
}

/**
 * Safely access the PROMETHEUS_PUSHGATEWAY_URL key on `process.env`, if it exists.
 *
 * NOTE - We access the value directly on `process.env` to play nicely with Parcel, which does not allow you to pass around `process.env` as an object.
 */
const getPushGatewayFromEnv = () => {
  if (
    typeof process !== "undefined" &&
    process?.env?.PROMETHEUS_PUSHGATEWAY_URL
  ) {
    return process.env.PROMETHEUS_PUSHGATEWAY_URL;
  }

  return null;
};

/**
 * Safely access the PROMETHEUS_PUSHGATEWAY_INTERVAL key on `process.env`, if it exists.
 *
 * NOTE - We access the value directly on `process.env` to play nicely with Parcel, which does not allow you to pass around `process.env` as an object.
 */
const getPushGatewayIntervalFromEnv = () => {
  if (
    typeof process !== "undefined" &&
    process?.env?.PROMETHEUS_PUSHGATEWAY_INTERVAL
  ) {
    return process.env.PROMETHEUS_PUSHGATEWAY_INTERVAL;
  }

  return null;
};
