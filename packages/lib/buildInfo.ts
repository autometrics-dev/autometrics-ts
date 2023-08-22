import type { UpDownCounter } from "@opentelemetry/api";

import { BUILD_INFO_DESCRIPTION, BUILD_INFO_NAME } from "./constants.ts";
import { getBranch, getCommit, getVersion } from "./platform.deno.ts";
import { getMeter } from "./instrumentation.ts";

/**
 * BuildInfo is used to create the `build_info` metric that
 * helps to identify the version, commit, and branch of the
 * application, the metrics of which are being collected.
 *
 * @group Initialization API
 */
export type BuildInfo = {
  /**
   * The current version of the application. Should be set through an
   * environment variable: `AUTOMETRICS_VERSION` or `PACKAGE_VERSION`.
   */
  version?: string;
  /**
   * The current commit hash of the application. Should be set through an
   * environment variable: `AUTOMETRICS_COMMIT` or `COMMIT_SHA`.
   */
  commit?: string;
  /**
   * The current commit hash of the application. Should be set through an
   * environment variable: `AUTOMETRICS_BRANCH` or `BRANCH_NAME`.
   */
  branch?: string;

  /**
   * The "clearmode" label of the `build_info` metric.
   * This label is used when pushing to a Gravel Gateway
   *
   * When pushing to a Gravel Gateway, it's recommended to use the "family" clearmode.
   * See the Gravel Gateways documentation for more details.
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
export let buildInfo: BuildInfo = {};
let buildInfoGauge: UpDownCounter;

/**
 * Records the build info for the application.
 *
 * @internal
 */
export function recordBuildInfo(buildInfo: BuildInfo) {
  if (!buildInfoGauge) {
    buildInfoGauge = getMeter().createUpDownCounter(BUILD_INFO_NAME, {
      description: BUILD_INFO_DESCRIPTION,
    });
  }

  buildInfoGauge.add(1, buildInfo);
}

/**
 * Sets the build info for the application.
 *
 * @internal
 */
export function setBuildInfo() {
  if (Object.keys(buildInfo).length > 0) {
    return buildInfo;
  }

  buildInfo = {
    version: getVersion(),
    commit: getCommit(),
    branch: getBranch(),
  };

  recordBuildInfo(buildInfo);

  return buildInfo;
}
