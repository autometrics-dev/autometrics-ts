import { build, emptyDir } from "https://deno.land/x/dnt@0.38.1/mod.ts";

const OUT_DIR = "./dist";

await emptyDir(OUT_DIR);

const packages = {
  lib: "@autometrics/autometrics",
};

const packageJsonFields = {
  version: Deno.args[0],
  description:
    "Easily add metrics to your system -- " +
    "and actually understand them using automatically customized Prometheus queries",
  author: "Fiberplane <info@fiberplane.com>",
  contributors: [
    "Brett Beutell",
    "Evan Schwartz",
    "Jacco Flenter",
    "Laurynas Keturakis",
    "Oscar van Zijverden",
    "Stephan Lagerwaard",
    "Arend van Beelen jr.",
  ],
  repository: {
    type: "git",
    url: "git+https://github.com/autometrics-dev/autometrics-ts.git",
  },
  bugs: {
    url: "https://github.com/autometrics-dev/autometrics-ts/issues",
  },
  license: "MIT",
  publishConfig: {
    access: "public",
  },
  devDependencies: {
    "@opentelemetry/api": "^1.4.0",
    "@types/node": "^18.6.5",
  },
};

for (const [dir, name] of Object.entries(packages)) {
  await build({
    entryPoints: [`packages/${dir}/mod.ts`],
    outDir: `${OUT_DIR}/${dir}`,
    shims: { deno: false },
    package: {
      name,
      ...packageJsonFields,
    },
    mappings: {
      "./packages/lib/platform.deno.ts": "./packages/lib/platform.node.ts",
      "./vendor/opentelemetry-api/mod.ts": {
        name: "@opentelemetry/api",
        peerDependency: true,
        version: "^1.4.0",
      },
      "./vendor/opentelemetry-exporter-prometheus/mod.ts": {
        name: "@opentelemetry/exporter-prometheus",
        version: "^0.41.0",
      },
      "./vendor/opentelemetry-sdk-metrics/mod.ts": {
        name: "@opentelemetry/sdk-metrics",
        version: "^1.15.0",
      },
    },
    packageManager: "yarn",
    test: false,
    filterDiagnostic: (diagnostic) =>
      // Ignore messages about `fetch` in Node.js. It's a TODO to have a better
      // fallback, but there's already a guard around its usage.
      !diagnostic.messageText.toString().includes("Cannot find name 'fetch'"),
    postBuild() {
      // steps to run after building and before running the tests
      Deno.copyFileSync("LICENSE", `${OUT_DIR}/${dir}/LICENSE`);
      Deno.copyFileSync(
        `packages/${dir}/README.md`,
        `${OUT_DIR}/${dir}/README.md`,
      );
    },
  });
}
