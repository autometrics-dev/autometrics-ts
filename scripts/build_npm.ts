import { bold, cyan, green } from "$std/fmt/colors.ts";
import { emptyDir, PackageJson } from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { rollup, Plugin } from "npm:rollup@3.29.4";
import { dts } from "npm:rollup-plugin-dts@6.1.0";
import { swc, defineRollupSwcOption } from "npm:rollup-plugin-swc3@0.10.3";

const OUT_DIR = "./dist";

const version = getVersion();

const { imports } = readJson<{ imports: Record<string, string> }>(
  "./deno.json",
);

const otelImports = Object.entries(imports)
  .filter(([key]) => key.startsWith("$otel/"))
  .reduce((imports, [key, value]) => {
    // Strip `npm:` prefix and version specifier:
    imports[key] = value.slice(4, value.lastIndexOf("@"));
    return imports;
  }, {} as Record<string, string>);

const packages = {
  "mod.ts": {
    name: "autometrics",
    description:
      "Easily add metrics to your system -- " +
      "and actually understand them using automatically customized Prometheus queries",
    readme: "packages/autometrics/README.node.md",
    mappings: {
      ...pick(otelImports, "$otel/api", "$otel/sdk-metrics"),
      "./packages/autometrics/src/platform.deno.ts":
        "./packages/autometrics/src/platform.node.ts",
    },
  },
  "exporter-otlp-http.ts": {
    name: "exporter-otlp-http",
    description: "Export metrics using OTLP over HTTP/JSON",
    readme: "packages/autometrics/src/exporter-otlp-http/README.node.md",
    mappings: {
      ...pick(
        otelImports,
        "$otel/api",
        "$otel/exporter-metrics-otlp-http",
        "$otel/sdk-metrics",
      ),
      "./packages/autometrics/mod.ts": "@autometrics/autometrics",
    },
  },
  "exporter-prometheus.ts": {
    name: "exporter-prometheus",
    description:
      "Export metrics by pushing them to a Prometheus-compatible gateway",
    readme: "packages/autometrics/src/exporter-prometheus/README.node.md",
    mappings: {
      ...pick(otelImports, "$otel/api", "$otel/sdk-metrics"),
      "./packages/autometrics/mod.ts": "@autometrics/autometrics",
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
      ...pick(otelImports, "$otel/api", "$otel/core", "$otel/sdk-metrics"),
      "./packages/autometrics/mod.ts": "@autometrics/autometrics",
      "./packages/autometrics/src/exporter-prometheus/PrometheusSerializer.ts":
        "@opentelemetry/exporter-prometheus",
    },
  },
};

const packageJsonFields = {
  version,
  type: "module",
  exports: {
    browser: "./index.web.js",
    import: "./index.mjs",
    require: "./index.cjs",
  },
  main: "./index.cjs",
  module: "./index.mjs",
  browser: "./index.web.js",
  types: "./index.d.ts",
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
    "@types/node": "^18.6.5",
  },
};

const dtsPlugin = dts();
const swcPlugin = swc(
  defineRollupSwcOption({
    jsc: {
      target: "es2021",
      transform: {
        decoratorMetadata: true,
        legacyDecorator: true,
      },
    },
    sourceMaps: true,
  }),
);

for (const [entrypoint, packageInfo] of Object.entries(packages)) {
  const { name, description, mappings, readme } = packageInfo;
  console.log(bold(`Building ${cyan(`@autometrics/${name}`)} package...`));

  const outDir = `${OUT_DIR}/${name}`;
  await emptyDir(outDir);

  const nodeBuild = await rollup({
    input: `./packages/autometrics/${entrypoint}`,
    external: ["node:async_hooks", ...Object.values(mappings)],
    plugins: [/*dtsPlugin,*/ rewriteMappings(mappings), swcPlugin],
  });
  await nodeBuild.write({ file: `${outDir}/index.mjs`, format: "esm" });
  await nodeBuild.write({ file: `${outDir}/index.cjs`, format: "commonjs" });
  await nodeBuild.close();

  const webBuild = await rollup({
    input: `./packages/autometrics/${entrypoint}`,
    external: Object.values(mappings),
    plugins: [
      rewriteMappings({
        ...mappings,
        "./packages/autometrics/src/platform.deno.ts":
          "./packages/autometrics/src/platform.web.ts",
      }),
      swcPlugin,
    ],
  });
  await webBuild.write({ file: `${outDir}/index.web.js`, format: "esm" });
  await webBuild.close();

  const packageJson: PackageJson = {
    name: `@autometrics/${name}`,
    description,
    ...packageJsonFields,
  };

  packageJson.dependencies = Object.values(mappings)
    .filter((target) => !target.startsWith("."))
    .reduce((dependencies, npmPackage) => {
      dependencies[npmPackage] =
        npmPackage === "@autometrics/autometrics"
          ? version
          : getNpmVersionRange(npmPackage);
      return dependencies;
    }, {} as Record<string, string>);

  Deno.writeFileSync(
    `${OUT_DIR}/${name}/package.json`,
    new TextEncoder().encode(JSON.stringify(packageJson, null, 2)),
  );

  Deno.copyFileSync("LICENSE", `${OUT_DIR}/${name}/LICENSE`);
  Deno.copyFileSync(readme, `${OUT_DIR}/${name}/README.md`);
}

console.log(bold(green("Done.")));

/**
 * Returns the version range to use for a given NPM package by extracting it
 * from the `imports` mapping in `deno.json`.
 *
 * This helps us to avoid hard-coding version numbers in this script.
 */
function getNpmVersionRange(npmPackage: string): string {
  const prefix = `npm:${npmPackage}@`;
  for (const value of Object.values(imports)) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  throw new Error(`Cannot find version range for ${npmPackage} in deno.json`);
}

/**
 * Takes the version from the CLI arguments and returns it in the format as it
 * should be in the `package.json`.
 *
 * This supports taking GitHub tag refs to extract the version from them and
 * will strip any leading `v` if present.
 *
 * If no version is given as a CLI argument, the version specified in the root
 * `package.json` is returned.
 */
function getVersion() {
  let version = Deno.args[0] || readJson<PackageJson>("./package.json").version;
  if (version.startsWith("refs/tags/lib-")) {
    version = version.slice(14);
  }
  if (version.startsWith("v")) {
    version = version.slice(1);
  }
  return version;
}

/**
 * Creates an object from the specified input object's properties.
 */
export function pick<
  T extends Record<string, unknown>,
  K extends Array<keyof T>,
>(object: T, ...propNames: K): Pick<T, K[number]> {
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => propNames.includes(key)),
  ) as Pick<T, K[number]>;
}

function readJson<T>(path: string): T {
  const decoder = new TextDecoder("utf-8");
  return JSON.parse(decoder.decode(Deno.readFileSync(path)));
}

/**
 * Rollup plugin for rewriting our mappings.
 */
function rewriteMappings(mappings: Record<string, string>): Plugin {
  const entries = Object.entries(mappings).map(([from, to]) => ({ from, to }));
  const cwd = Deno.cwd();

  return {
    name: "rewriteMappings",
    async resolveId(importee, importer, resolveOptions) {
      // We first call the regular resolver. This allows us to map based on the
      // resolved path.
      const resolved = await this.resolve(
        importee,
        importer,
        Object.assign({ skipSelf: true }, resolveOptions),
      );

      const mapped = entries.find(
        resolved
          ? (entry) => {
              const path = resolved.id.startsWith(cwd)
                ? `./${resolved.id.slice(cwd.length + 1)}`
                : resolved.id;
              return entry.from === path;
            }
          : (entry) => entry.from === importee,
      );

      if (mapped) {
        return mapped.to.startsWith("./")
          ? { id: `${cwd}/${mapped.to.slice(2)}` }
          : { id: mapped.to };
      }
    },
  };
}
