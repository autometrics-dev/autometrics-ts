import { bold, cyan, green } from "$std/fmt/colors.ts";
import { dts } from "npm:rollup-plugin-dts@6.1.0";
import { emptyDir, PackageJson } from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { rollup, Plugin } from "npm:rollup@3.29.4";
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

type PackageInfo = {
  name: string;
  description: string;
  readme: string;
  mappings: Record<string, string>;
};

const packages: Record<string, PackageInfo> = {
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
      "./packages/autometrics/src/exporter-prometheus-push-gateway/fetch.ts":
        "node-fetch-native",
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
    types: "./index.d.ts",
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
  const { name, mappings, readme } = packageInfo;
  console.log(bold(`Building ${cyan(`@autometrics/${name}`)} package...`));

  const outDir = `${OUT_DIR}/${name}`;
  await emptyDir(outDir);

  await generateNodeBundles(entrypoint, outDir, mappings);
  await generateWebBundle(entrypoint, outDir, mappings);
  await generateDtsBundle(entrypoint, outDir, mappings);
  await generatePackageJson(outDir, packageInfo);
  await installPackage(outDir);

  await Deno.copyFile("LICENSE", `${outDir}/LICENSE`);
  await Deno.copyFile(readme, `${outDir}/README.md`);
}

console.log(bold(green("Done.")));

/**
 * Generates the `index.cjs` and `index.mjs` files.
 */
async function generateNodeBundles(
  entrypoint: string,
  outDir: string,
  mappings: Record<string, string>,
) {
  console.log("- Generating Node.js bundles...");

  const nodeBuild = await rollup({
    input: `./packages/autometrics/${entrypoint}`,
    external: ["node:async_hooks", ...Object.values(mappings)],
    plugins: [rewriteMappings(mappings), swcPlugin],
  });
  await nodeBuild.write({ file: `${outDir}/index.mjs`, format: "esm" });
  await nodeBuild.write({ file: `${outDir}/index.cjs`, format: "commonjs" });
  await nodeBuild.close();
}

/**
 * Generates the `index.web.js` file.
 */
async function generateWebBundle(
  entrypoint: string,
  outDir: string,
  mappings: Record<string, string>,
) {
  console.log("- Generating web bundle...");

  const webBuild = await rollup({
    input: `./packages/autometrics/${entrypoint}`,
    external: Object.values(mappings),
    plugins: [
      rewriteMappings({
        ...omit(
          mappings,
          "./packages/autometrics/src/exporter-prometheus-push-gateway/fetch.ts",
        ),
        "./packages/autometrics/src/platform.deno.ts":
          "./packages/autometrics/src/platform.web.ts",
      }),
      swcPlugin,
    ],
  });
  await webBuild.write({ file: `${outDir}/index.web.js`, format: "esm" });
  await webBuild.close();
}

/**
 * Generates the `index.d.ts` file.
 */
async function generateDtsBundle(
  entrypoint: string,
  outDir: string,
  mappings: Record<string, string>,
) {
  console.log("- Generating TypeScript types...");

  const typesBuild = await rollup({
    input: `./packages/autometrics/${entrypoint}`,
    external: Object.values(mappings),
    plugins: [rewriteMappings(mappings), swcPlugin, dtsPlugin],
  });
  await typesBuild.write({ file: `${outDir}/index.d.ts`, format: "es" });
  await typesBuild.close();
}

/**
 * Generates the `package.json` file.
 */
async function generatePackageJson(outDir: string, packageInfo: PackageInfo) {
  console.log("- Generating package.json...");

  const { name, description, mappings } = packageInfo;
  const packageJson: PackageJson = {
    name: `@autometrics/${name}`,
    description,
    ...packageJsonFields,
    dependencies: Object.values(mappings)
      .filter((target) => !target.startsWith("."))
      .reduce((dependencies, npmPackage) => {
        dependencies[npmPackage] =
          npmPackage === "@autometrics/autometrics"
            ? version
            : getNpmVersionRange(npmPackage);
        return dependencies;
      }, {} as Record<string, string>),
  };

  await Deno.writeFile(
    `${outDir}/package.json`,
    new TextEncoder().encode(JSON.stringify(packageJson, null, 2)),
  );
}

async function installPackage(outDir: string) {
  console.log("- Running `yarn install`...");

  const yarn = new Deno.Command("yarn", {
    args: ["install"],
    cwd: outDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  await yarn.output();
}

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
 * Creates an object from another, with one or more properties removed.
 */
export function omit<
  T extends Record<string, unknown>,
  K extends Array<keyof T>,
>(object: T, ...propNames: K): Omit<T, K[number]> {
  return pickBy(object, (_value, key) => !propNames.includes(key)) as Omit<
    T,
    K[number]
  >;
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

/**
 * Creates an object from all the input object's properties the given predicate
 * returns `true` for.
 */
export function pickBy<T extends Record<string, unknown>, K = keyof T>(
  object: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(object).filter(([key, value]) =>
      predicate(value as T[keyof T], key as keyof T),
    ),
  ) as T;
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
      if (importee.startsWith(".")) {
        // For relative imports, we first call the regular resolver. This allows
        // us to map based on the resolved path.
        const resolved = await this.resolve(
          importee,
          importer,
          Object.assign({ skipSelf: true }, resolveOptions),
        );
        if (!resolved) {
          return null;
        }

        const path = resolved.id.startsWith(cwd)
          ? `./${resolved.id.slice(cwd.length + 1)}`
          : resolved.id;

        const mapped = entries.find((entry) => entry.from === path);
        if (mapped) {
          return mapped.to.startsWith("./")
            ? { id: `${cwd}/${mapped.to.slice(2)}` }
            : { id: mapped.to };
        }
      } else {
        // Other imports are simply mapped to an NPM package.
        const mapped = entries.find((entry) => entry.from === importee);
        if (mapped) {
          return { id: mapped.to };
        }
      }
    },
  };
}
