import type { Attributes } from "$otel/api";

import {
  OBJECTIVE_LATENCY_THRESHOLD_LABEL,
  OBJECTIVE_NAME_LABEL,
  OBJECTIVE_PERCENTILE_LABEL,
} from "./constants.ts";

/**
 * This represents a Service-Level Objective (SLO) for a function or group of functions.
 * The objective should be given a descriptive name and can represent
 * a success rate and/or latency objective.
 *
 * @example
 * ```ts
 * import { autometrics, Objective, ObjectiveLatency, ObjectivePercentile } from "@autometrics/autometrics";
 *
 * const API_SLO: Objective = {
 *   name: 'api',
 *   successRate: ObjectivePercentile.P99_9,
 *   latency: [ObjectiveLatency.Ms250, ObjectivePercentile.P99],
 * };
 *
 * const apiHandlerFn = autometrics({ objective: API_SLO }, function apiHandler(
 *   // ...
 * ));
 * ```
 *
 * #### How this works
 *
 * When an objective is added to a function, the metrics for that function will
 * have additional labels attached to specify the SLO details.
 *
 * Specifically, success rate objectives will add objective-related labels to the `function.calls.count` metric
 * and latency objectives will add labels to the `function.calls.duration` metric.
 *
 * Autometrics comes with a set of Prometheus [recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
 * and [alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
 * that will fire alerts when the given objective is being violated.
 *
 * By default, these recording rules will effectively lay dormant.
 * However, they are enabled when the special labels are present on certain metrics.
 *
 * @group Service Level Objective API
 */
export type Objective = {
  name: string;
  successRate?: ObjectivePercentile;
  latency?: [ObjectiveLatency, ObjectivePercentile];
};

/**
 * The percentage of requests that must meet the given criteria (success rate or latency)
 *
 * @group Service Level Objective API
 */
export enum ObjectivePercentile {
  /**
   * 90%
   */
  P90 = "90",
  /**
   * 95%
   */
  P95 = "95",
  /**
   * 99%
   */
  P99 = "99",
  /**
   * 99.9%
   */
  P99_9 = "99.9",
}

/**
 * The latency threshold, in milliseconds, for a given objective.
 *
 * @group Service Level Objective API
 */
export enum ObjectiveLatency {
  /**
   * 5 milliseconds
   */
  Ms5 = "0.005",
  /**
   * 10 milliseconds
   */
  Ms10 = "0.01",
  /**
   * 25 milliseconds
   */
  Ms25 = "0.025",
  /**
   * 50 milliseconds
   */
  Ms50 = "0.05",
  /**
   * 75 milliseconds
   */
  Ms75 = "0.075",
  /**
   * 100 milliseconds
   */
  Ms100 = "0.1",
  /**
   * 250 milliseconds
   */
  Ms250 = "0.25",
  /**
   * 500 milliseconds
   */
  Ms500 = "0.5",
  /**
   * 750 milliseconds
   */
  Ms750 = "0.75",
  /**
   * 1 second
   */
  Ms1000 = "1",
  /**
   * 2.5 seconds
   */
  Ms2500 = "2.5",
  /**
   * 5 seconds
   */
  Ms5000 = "5",
  /**
   * 7.5 seconds
   */
  Ms7500 = "7.5",
  /**
   * 10 seconds
   */
  Ms10000 = "10",
}

export function getObjectiveAttributes(objective: Objective | undefined): {
  counterObjectiveAttributes: Attributes;
  histogramObjectiveAttributes: Attributes;
} {
  // NOTE - Gravel Gateway will reject two metrics of the same name if one of
  //        them has a subset of the attributes of the other. This means to be
  //        able to support functions that have objectives, as well as functions
  //        that do not have objectives, we need to default to setting the
  //        labels to empty strings.
  const counterObjectiveAttributes: Attributes = {
    [OBJECTIVE_NAME_LABEL]: "",
    [OBJECTIVE_PERCENTILE_LABEL]: "",
  };

  const histogramObjectiveAttributes: Attributes = {
    [OBJECTIVE_NAME_LABEL]: "",
    [OBJECTIVE_LATENCY_THRESHOLD_LABEL]: "",
    [OBJECTIVE_PERCENTILE_LABEL]: "",
  };

  if (objective) {
    const { latency, name, successRate } = objective;

    counterObjectiveAttributes[OBJECTIVE_NAME_LABEL] = name;
    histogramObjectiveAttributes[OBJECTIVE_NAME_LABEL] = name;

    if (latency) {
      const [threshold, latencyPercentile] = latency;
      histogramObjectiveAttributes[OBJECTIVE_LATENCY_THRESHOLD_LABEL] =
        threshold;
      histogramObjectiveAttributes[OBJECTIVE_PERCENTILE_LABEL] =
        latencyPercentile;
    }

    if (successRate) {
      counterObjectiveAttributes[OBJECTIVE_PERCENTILE_LABEL] = successRate;
    }
  }

  return { counterObjectiveAttributes, histogramObjectiveAttributes };
}
