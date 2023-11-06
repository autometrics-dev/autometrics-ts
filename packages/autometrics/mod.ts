export * from "./src/buildInfo.ts";
export {
  AUTOMETRICS_VERSION_LABEL,
  BRANCH_LABEL,
  COMMIT_LABEL,
  REPOSITORY_PROVIDER_LABEL,
  REPOSITORY_URL_LABEL,
  VERSION_LABEL,
} from "./src/constants.ts";
export * from "./src/decorators.ts";
export {
  registerExporter,
  type ExporterOptions,
} from "./src/instrumentation.ts";
export * as amLogger from "./src/logger.ts";
export * from "./src/objectives.ts";
export * from "./src/wrapper.ts";
