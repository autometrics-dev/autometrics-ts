import type { UpDownCounter } from "$otel/api";

import { BUILD_INFO_DESCRIPTION, BUILD_INFO_NAME } from "./constants.ts";
import { getMeter } from "./instrumentation.ts";
import { debug } from "./logger.ts";
import { getBranch, getCommit, getVersion } from "./platform.deno.ts";

/**
 * BuildInfo is used to create the `build_info` metric that helps to identify
 * the version, commit, and branch of the application of which the metrics are
 * being collected.
 *
 * @group Initialization API
 */
export type BuildInfo = {
  /**
   * The current version of the application.
   *
   * Should be set through the `AUTOMETRICS_VERSION` environment variable, or by
   * explicitly specifying the `buildInfo` when calling `init()`.
   */
  version?: string;

  /**
   * The current commit hash of the application.
   *
   * Should be set through the `AUTOMETRICS_COMMIT` environment variable, or by
   * explicitly specifying the `buildInfo` when calling `init()`.
   */
  commit?: string;

  /**
   * The current commit hash of the application.
   *
   * Should be set through the `AUTOMETRICS_BRANCH` environment variable, or by
   * explicitly specifying the `buildInfo` when calling `init()`.
   */
  branch?: string;

  /**
   * The "clearmode" label of the `build_info` metric.
   *
   * Only used when pushing to a Gravel Gateway. Should be set by explicitly
   * specifying the `buildInfo` when calling `init()`.
   *
   * When pushing to a Gravel Gateway, it's recommended to use the "family"
   * clearmode. See the Gravel Gateways documentation for more details.
   */
  clearmode?: "replace" | "aggregate" | "family" | "";
};

/**
 * The build info of the application.
 *
 * Should be set through the `init` function.
 *
 * @internal
 */
const buildInfo: BuildInfo = {};

let buildInfoGauge: UpDownCounter;

/**
 * Records the build info for the application.
 *
 * This function is automatically called for you when you call `init()` in one
 * of the exporters.
 */
export function recordBuildInfo(info: BuildInfo) {
  debug("Recording build info");

  buildInfo.version = info.version ?? "";
  buildInfo.commit = info.commit ?? "";
  buildInfo.branch = info.branch ?? "";
  buildInfo.clearmode = info.clearmode ?? "";

  if (!buildInfoGauge) {
    buildInfoGauge = getMeter().createUpDownCounter(BUILD_INFO_NAME, {
      description: BUILD_INFO_DESCRIPTION,
    });
  }

  buildInfoGauge.add(1, buildInfo);
}

/**
 * Creates the default `BuildInfo` based on environment variables.
 */
export function createDefaultBuildInfo(): BuildInfo {
  return {
    version: getVersion(),
    commit: getCommit(),
    branch: getBranch(),
  };
}
