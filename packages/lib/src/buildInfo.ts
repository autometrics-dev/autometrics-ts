import { getMeter } from "./instrumentation";

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

  buildInfo = {
    version: getVersion(),
    commit: getCommit(),
    branch: getBranch(),
  };

  const gauge = getMeter().createUpDownCounter("build_info");
  gauge.add(1, buildInfo);

  return buildInfo;
}

function getVersion(): string | undefined {
  if (process) {
    if (process.env.npm_package_version) {
      return process.env.npm_package_version;
    }
    return process.env.PACKAGE_VERSION || process.env.AUTOMETRICS_VERSION;
    //@ts-ignore
  } else if (Deno) {
    return (
      //@ts-ignore
      Deno.env.get("AUTOMETRICS_VERSION") || Deno.env.get("PACKAGE_VERSION")
    );
  } else {
    return;
  }
}

function getCommit() {
  if (process) {
    return process.env.COMMIT_SHA || process.env.AUTOMETRICS_COMMIT;
    //@ts-ignore
  } else if (Deno) {
    //@ts-ignore
    return Deno.env.get("AUTOMETRICS_COMMIT");
  } else {
    return;
  }
}

function getBranch() {
  if (process) {
    return process.env.BRANCH_NAME || process.env.AUTOMETRICS_BRANCH;
    //@ts-ignore
  } else if (Deno) {
    //@ts-ignore
    return Deno.env.get("AUTOMETRICS_BRANCH");
  } else {
    return;
  }
}
