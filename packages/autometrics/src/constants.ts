// Spec version
export const AUTOMETRICS_VERSION = "1.0.0";

export const AUTOMETRICS_DEFAULT_SERVICE_NAME =
  "AUTOMETRICS_TYPESCRIPT_SERVICE";

// Metrics
export const COUNTER_NAME = "function.calls" as const;
export const HISTOGRAM_NAME = "function.calls.duration" as const;
export const GAUGE_NAME = "function.calls.concurrent" as const;
export const BUILD_INFO_NAME = "build_info" as const;

// Labels
export const AUTOMETRICS_VERSION_LABEL = "autometrics.version" as const;
export const BRANCH_LABEL = "branch" as const;
export const CALLER_FUNCTION_LABEL = "caller.function" as const;
export const CALLER_MODULE_LABEL = "caller.module" as const;
export const COMMIT_LABEL = "commit" as const;
export const FUNCTION_LABEL = "function" as const;
export const MODULE_LABEL = "module" as const;
export const OBJECTIVE_NAME_LABEL = "objective.name" as const;
export const OBJECTIVE_PERCENTILE_LABEL = "objective.percentile" as const;
export const OBJECTIVE_LATENCY_THRESHOLD_LABEL =
  "objective.latency_threshold" as const;
export const REPOSITORY_URL_LABEL = "repository.url" as const;
export const REPOSITORY_PROVIDER_LABEL = "repository.provider" as const;
export const RESULT_LABEL = "result" as const;
export const SERVICE_NAME_LABEL = "service.name" as const;
export const VERSION_LABEL = "version" as const;

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
