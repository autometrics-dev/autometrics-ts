import {
  ExplicitBucketHistogramAggregation,
  View,
} from "@opentelemetry/sdk-metrics";

import { HISTOGRAM_NAME } from "./constants";

export function createDefaultHistogramView(): View {
  return new View({
    // See: https://github.com/autometrics-dev/autometrics-ts/issues/102
    aggregation: new ExplicitBucketHistogramAggregation([
      0, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5,
      10,
    ]),
    instrumentName: HISTOGRAM_NAME,
  });
}
