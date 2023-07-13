// Metrics
export const COUNTER_NAME = "function.calls" as const;
export const HISTOGRAM_NAME = "function.calls.duration" as const;
export const GAUGE_NAME = "function.calls.concurrent" as const;
export const BUILD_INFO_NAME = "build_info" as const;

// Descriptions
export const COUNTER_DESCRIPTION =
  "Autometrics counter for tracking function calls" as const;
export const HISTOGRAM_DESCRIPTION =
  "Autometrics histogram for tracking function call duration" as const;
export const GAUGE_DESCRIPTION =
  "Autometrics gauge for tracking concurrent function calls" as const;
export const BUILD_INFO_DESCRIPTION =
  "Autometrics info metric for tracking software version and build details" as const;

// Units
export const HISTOGRAM_UNIT = "seconds" as const;
