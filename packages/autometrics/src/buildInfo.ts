import type { UpDownCounter } from "$otel/api";

import {
  AUTOMETRICS_VERSION_LABEL,
  BRANCH_LABEL,
  BUILD_INFO_DESCRIPTION,
  BUILD_INFO_NAME,
  COMMIT_LABEL,
  REPOSITORY_PROVIDER_LABEL,
  REPOSITORY_URL_LABEL,
  SERVICE_NAME_LABEL,
  VERSION_LABEL,
} from "./constants.ts";
import { getMeter } from "./instrumentation.ts";
import { debug } from "./logger.ts";
import {
  getBranch,
  getCommit,
  getRepositoryProvider,
  getRepositoryUrl,
  getServiceName,
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
   * The service name to be used for this project.
   *
   * Should be set through the `AUTOMETRICS_SERVICE_NAME` or `OTEL_SERVICE_NAME`
   * environment variable, or by explicitly specifying the `buildInfo` when
   * calling `init()`.
   *
   * @warning Caveat: Because the service name is also submitted together with
   * function metrics, you need to be careful to call `init()` *before* invoking
   * any Autometrics wrappers if you do not use environment variables for
   * setting the service name.
   *
   * If no service name can be determined, the string
   * "AUTOMETRICS_TYPESCRIPT_SERVICE" is used. Web users who cannot use
   * environment variables can also use a bundler with a string replacer plugin
   * to replace this string with their desired value, as a workaround if calling
   * `init()` first is not feasible.
   */
  [SERVICE_NAME_LABEL]?: string;

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
export const buildInfo: BuildInfo = {
  [AUTOMETRICS_VERSION_LABEL]: "1.0.0",
  [BRANCH_LABEL]: getBranch() ?? "",
  [COMMIT_LABEL]: getCommit() ?? "",
  [REPOSITORY_PROVIDER_LABEL]: getRepositoryProvider() ?? "",
  [REPOSITORY_URL_LABEL]: getRepositoryUrl() ?? "",
  [SERVICE_NAME_LABEL]: getServiceName(),
  [VERSION_LABEL]: getVersion() ?? "",
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
    buildInfo[REPOSITORY_URL_LABEL] &&
    info[REPOSITORY_PROVIDER_LABEL] === undefined
  ) {
    buildInfo[REPOSITORY_PROVIDER_LABEL] = detectRepositoryProvider(
      buildInfo[REPOSITORY_URL_LABEL],
    );
  }

  if (!buildInfoGauge) {
    buildInfoGauge = getMeter().createUpDownCounter(BUILD_INFO_NAME, {
      description: BUILD_INFO_DESCRIPTION,
    });
  }

  buildInfoGauge.add(1, buildInfo);
}
