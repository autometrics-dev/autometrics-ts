import { getMeter } from "./instrumentation";
import { getRuntime, Runtime } from "./utils";
import { UpDownCounter } from "@opentelemetry/api";

/**
 * BuildInfo is used to create the `build_info` metric that
 * helps to identify the version, commit, and branch of the
 * application, the metrics of which are being collected.
 */
export type BuildInfo = {
  version?: string;
  commit?: string;
  branch?: string;
};

export let buildInfo: BuildInfo = {};
let buildInfoGauge: UpDownCounter;

export function recordBuildInfo(buildInfo: BuildInfo) {
  if (!buildInfoGauge) {
    buildInfoGauge = getMeter().createUpDownCounter("build_info");
  }

  buildInfoGauge.add(1, buildInfo);
}

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

function getCommit(runtime: Runtime) {
  if (runtime === "node") {
    return process.env.COMMIT_SHA || process.env.AUTOMETRICS_COMMIT;
  }

  if (runtime === "deno") {
    //@ts-ignore
    return Deno.env.get("AUTOMETRICS_COMMIT");
  }
}

function getBranch(runtime: Runtime) {
  if (runtime === "node") {
    return process.env.BRANCH_NAME || process.env.AUTOMETRICS_BRANCH;
  }

  if (runtime === "deno") {
    //@ts-ignore
    return Deno.env.get("AUTOMETRICS_BRANCH");
  }
}
