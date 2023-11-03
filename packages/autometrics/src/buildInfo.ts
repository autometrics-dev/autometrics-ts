import type { UpDownCounter } from "$otel/api";

import {
  AUTOMETRICS_VERSION_LABEL,
  BRANCH_LABEL,
  BUILD_INFO_DESCRIPTION,
  BUILD_INFO_NAME,
  COMMIT_LABEL,
  REPOSITORY_PROVIDER_LABEL,
  REPOSITORY_URL_LABEL,
  VERSION_LABEL,
} from "./constants.ts";
import { getMeter } from "./instrumentation.ts";
import { debug } from "./logger.ts";
import {
  getBranch,
  getCommit,
  getRepositoryProvider,
  getRepositoryUrl,
  getVersion,
} from "./platform.deno.ts";
import { detectRepositoryProvider } from "./utils.ts";

/**
 * BuildInfo is used to create the `build_info` metric that helps to identify
 * the version, commit, and branch of the application of which the metrics are
 * being collected.
 *
 * @group Initialization API
 */
export type BuildInfo = {
  /**
   * The version of the Autometrics specification supported by this library.
   *
   * This is set automatically by `autometrics-ts` and you should not override
   * this unless you know what you are doing.
   */
  [AUTOMETRICS_VERSION_LABEL]?: string;

  /**
   * The current commit hash of the application.
   *
   * Should be set through the `AUTOMETRICS_BRANCH` environment variable, or by
   * explicitly specifying the `buildInfo` when calling `init()`.
   */
  [BRANCH_LABEL]?: string;

  /**
   * The current commit hash of the application.
   *
   * Should be set through the `AUTOMETRICS_COMMIT` environment variable, or by
   * explicitly specifying the `buildInfo` when calling `init()`.
   */
  [COMMIT_LABEL]?: string;

  /**
   * The URL to the repository where the project's source code is located.
   */
  [REPOSITORY_URL_LABEL]?: string;

  /**
   * A hint as to which provider is being used to host the repository.
   */
  [REPOSITORY_PROVIDER_LABEL]?: string;

  /**
   * The current version of the application.
   *
   * Should be set through the `AUTOMETRICS_VERSION` environment variable, or by
   * explicitly specifying the `buildInfo` when calling `init()`.
   */
  [VERSION_LABEL]?: string;

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
const buildInfo: BuildInfo = {
  [AUTOMETRICS_VERSION_LABEL]: "1.0.0",
  [BRANCH_LABEL]: "",
  [COMMIT_LABEL]: "",
  [REPOSITORY_PROVIDER_LABEL]: "",
  [REPOSITORY_URL_LABEL]: "",
  [VERSION_LABEL]: "",
  clearmode: "",
};

let buildInfoGauge: UpDownCounter;

/**
 * Records the build info for the application.
 *
 * This function is automatically called for you when you call `init()` in one
 * of the exporters.
 */
export function recordBuildInfo(info: BuildInfo) {
  debug("Recording build info");

  for (const key of Object.keys(buildInfo)) {
    const labelName = key as keyof BuildInfo;
    const labelValue = info[labelName];
    if (typeof labelValue === "string") {
      (buildInfo[labelName] as string) = labelValue;
    }
  }

  if (
    info[REPOSITORY_URL_LABEL] &&
    info[REPOSITORY_PROVIDER_LABEL] === undefined
  ) {
    buildInfo[REPOSITORY_PROVIDER_LABEL] = detectRepositoryProvider(
      info[REPOSITORY_URL_LABEL],
    );
  }

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
    [VERSION_LABEL]: getVersion(),
    [COMMIT_LABEL]: getCommit(),
    [BRANCH_LABEL]: getBranch(),
    [REPOSITORY_URL_LABEL]: getRepositoryUrl(),
    [REPOSITORY_PROVIDER_LABEL]: getRepositoryProvider(),
  };
}
