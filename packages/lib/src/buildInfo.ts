import { getMeter } from "./instrumentation";
import { getRuntime, Runtime } from "./utils";
import { UpDownCounter } from "@opentelemetry/api";
import { BUILD_INFO_DESCRIPTION, BUILD_INFO_NAME } from "./constants";

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

  const runtime = getRuntime();

  buildInfo = {
    version: getVersion(runtime),
    commit: getCommit(runtime),
    branch: getBranch(runtime),
  };

  recordBuildInfo(buildInfo);

  return buildInfo;
}

/**
 * Gets the version of the application.
 *
 * @internal
 */
function getVersion(runtime: Runtime): string | undefined {
  if (runtime === "node") {
    if (process.env.npm_package_version) {
      return process.env.npm_package_version;
    }
    return process.env.PACKAGE_VERSION || process.env.AUTOMETRICS_VERSION;
  }

  if (runtime === "deno") {
    return (
      //@ts-ignore
      Deno.env.get("AUTOMETRICS_VERSION") || Deno.env.get("PACKAGE_VERSION")
    );
  }
}

/**
 * Gets the commit hash of the current state of the application.
 *
 * @internal
 */
function getCommit(runtime: Runtime) {
  if (runtime === "node") {
    return process.env.COMMIT_SHA || process.env.AUTOMETRICS_COMMIT;
  }

  if (runtime === "deno") {
    //@ts-ignore
    return Deno.env.get("AUTOMETRICS_COMMIT");
  }
}

/**
 * Gets the current branch of the application.
 *
 * @internal
 */
function getBranch(runtime: Runtime) {
  if (runtime === "node") {
    return process.env.BRANCH_NAME || process.env.AUTOMETRICS_BRANCH;
  }

  if (runtime === "deno") {
    //@ts-ignore
    return Deno.env.get("AUTOMETRICS_BRANCH");
  }
}
