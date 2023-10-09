import {
  build,
  emptyDir,
  PackageJson,
} from "https://deno.land/x/dnt@0.38.1/mod.ts";

const OUT_DIR = "./dist";

const version = Deno.args[0] || "beta";

const exporterMappings = {
  "./packages/autometrics/mod.ts": "@autometrics/autometrics",
};

const packages = {
  "mod.ts": {
    name: "autometrics",
    description:
      "Easily add metrics to your system -- " +
      "and actually understand them using automatically customized Prometheus queries",
    readme: "packages/autometrics/README.node.md",
    mappings: {
      "./packages/autometrics/src/platform.deno.ts":
        "./packages/autometrics/src/platform.node.ts",
    },
  },
  "exporter-otlp-http.ts": {
    name: "exporter-otlp-http",
    description: "Export metrics using OTLP over HTTP/JSON",
    readme: "packages/autometrics/src/exporter-otlp-http/README.node.md",
    mappings: exporterMappings,
  },
  "exporter-prometheus.ts": {
    name: "exporter-prometheus",
    description:
      "Export metrics by pushing them to a Prometheus-compatible gateway",
    readme: "packages/autometrics/src/exporter-prometheus/README.node.md",
    mappings: exporterMappings,
  },
  "exporter-prometheus-push-gateway.ts": {
    name: "exporter-prometheus-push-gateway",
    description: "Export metrics by opening up a Prometheus scrape endpoint",
    readme:
      "packages/autometrics/src/exporter-prometheus-push-gateway/README.node.md",
    mappings: exporterMappings,
  },
};

const packageJsonFields = {
  version,
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
  files: ["dist/", "README.md", "package.json"],
  devDependencies: {
    "@types/node": "^18.6.5",
  },
};

await emptyDir(OUT_DIR);

for (const [entrypoint, packageInfo] of Object.entries(packages)) {
  const { name, description, mappings, readme } = packageInfo;

  const packageJson: PackageJson = {
    name: `@autometrics/${name}`,
    description,
    ...packageJsonFields,
  };

  if (name !== "autometrics") {
    packageJson.dependencies = {
      "@autometrics/autometrics": version,
      "@opentelemetry/api": "^1.6.0", // will trigger unmet peer dependency warnings if omitted
    };
    packageJson.resolutions = {
      "@autometrics/autometrics": "portal:../autometrics",
    };
  }

  await build({
    entryPoints: [`packages/autometrics/${entrypoint}`],
    outDir: `${OUT_DIR}/${name}`,
    compilerOptions: {
      lib: ["ESNext", "DOM"],
    },
    shims: { deno: false },
    package: packageJson,
    mappings,
    packageManager: "yarn",
    test: false,
    filterDiagnostic: (diagnostic) =>
      // Ignore messages about `fetch` in Node.js. It's a TODO to have a better
      // fallback, but there's already a guard around its usage.
      !diagnostic.messageText.toString().includes("Cannot find name 'fetch'"),
    postBuild() {
      // steps to run after building and before running the tests
      Deno.copyFileSync("LICENSE", `${OUT_DIR}/${name}/LICENSE`);
      Deno.copyFileSync(readme, `${OUT_DIR}/${name}/README.md`);
    },
  });
}
