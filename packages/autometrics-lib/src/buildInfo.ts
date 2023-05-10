import { getMeter } from "./instrumentation";

type BuildInfo = {
  version?: string;
  commit?: string;
  branch?: string;
};

let buildInfo: BuildInfo | undefined;

export function registerBuildInfo() {
  if (buildInfo) {
    return;
  } else {
    buildInfo = {
      version: getVersion(),
      commit: getCommit(),
      branch: getBranch(),
    };

    const gauge = getMeter().createUpDownCounter("build_info");
    gauge.add(1, buildInfo);
  }
}

function getVersion() {
  if (process.env.npm_package_version) {
    return process.env.npm_package_version;
  } else {
    return process.env.PACKAGE_VERSION;
  }
}

function getCommit() {
  return process.env.COMMIT_SHA;
}

function getBranch() {
  return process.env.BRANCH_NAME;
}
