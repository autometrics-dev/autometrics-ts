export { MetricReader } from "npm:@opentelemetry/sdk-metrics@^1.17.0";

export * from "./src/buildInfo.ts";
export {
  type ExporterOptions,
  registerExporter,
} from "./src/instrumentation.ts";
export * as amLogger from "./src/logger.ts";
export * from "./src/objectives.ts";
export * from "./src/wrappers.ts";
