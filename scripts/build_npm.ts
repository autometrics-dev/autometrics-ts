import {
  build,
  emptyDir,
  PackageJson,
} from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { bold, cyan, green } from "$std/fmt/colors.ts";

const OUT_DIR = "./dist";

const version = getVersion();

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
    mappings: {
      ...exporterMappings,
      "./packages/autometrics/src/exporter-prometheus/PrometheusExporter.ts":
        "@opentelemetry/exporter-prometheus",
    },
  },
  "exporter-prometheus-push-gateway.ts": {
    name: "exporter-prometheus-push-gateway",
    description: "Export metrics by opening up a Prometheus scrape endpoint",
    readme:
      "packages/autometrics/src/exporter-prometheus-push-gateway/README.node.md",
    mappings: {
      ...exporterMappings,
      "./packages/autometrics/src/exporter-prometheus/PrometheusSerializer.ts":
        "@opentelemetry/exporter-prometheus",
    },
  },
};

const decoder = new TextDecoder("utf-8");
const denoLock = JSON.parse(decoder.decode(Deno.readFileSync("./deno.lock")));
const { specifiers } = denoLock.packages;

function getNpmVersionRange(npmPackageName: string): string {
  const keyPrefix = `npm:${npmPackageName}@`;
  for (const key of Object.keys(specifiers)) {
    if (key.startsWith(keyPrefix)) {
      return key.slice(keyPrefix.length);
    }
  }

  throw new Error(
    `Cannot find version range for ${npmPackageName} in deno.lock`,
  );
}

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

for (const [entrypoint, packageInfo] of Object.entries(packages)) {
  const { name, description, mappings, readme } = packageInfo;
  console.log(bold(`Building ${cyan(`@autometrics/${name}`)} package...`));

  const outDir = `${OUT_DIR}/${name}`;
  await emptyDir(outDir);

  const packageJson: PackageJson = {
    name: `@autometrics/${name}`,
    description,
    ...packageJsonFields,
  };

  if (name !== "autometrics") {
    packageJson.dependencies = {
      // will trigger unmet peer dependency warnings if omitted:
      "@opentelemetry/api": getNpmVersionRange("@opentelemetry/api"),
    };

    for (const npmPackage of Object.values(mappings).filter(
      (target) => !target.startsWith("."),
    )) {
      packageJson.dependencies[npmPackage] =
        npmPackage === "@autometrics/autometrics"
          ? version
          : getNpmVersionRange(npmPackage);
    }
  }

  await build({
    entryPoints: [`packages/autometrics/${entrypoint}`],
    outDir,
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

console.log(bold(green("Done.")));

/**
 * Takes the version from the CLI arguments (defaults to "beta") and returns it
 * in the format as it should be in the `package.json`.
 *
 * This supports taking GitHub tag refs to extract the version from them and
 * will strip any leading `v` if present.
 */
function getVersion() {
  let version = Deno.args[0] || "beta";
  if (version.startsWith("refs/tags/lib-")) {
    version = version.slice(14);
  }
  if (version.startsWith("v")) {
    version = version.slice(1);
  }
  return version;
}
