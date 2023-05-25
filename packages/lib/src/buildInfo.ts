import { getMeter } from "./instrumentation";
import { getRuntime, Runtime } from "./utils";

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

export function registerBuildInfo() {
  if (buildInfo) {
    return buildInfo;
  }

  const runtime = getRuntime();

  buildInfo = {
    version: getVersion(runtime),
    commit: getCommit(runtime),
    branch: getBranch(runtime),
  };

  const gauge = getMeter().createUpDownCounter("build_info");
  gauge.add(1, buildInfo);

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
