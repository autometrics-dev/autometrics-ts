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
};

for (const [dir, name] of Object.entries(packages)) {
  await build({
    entryPoints: [`packages/${dir}/mod.ts`],
    outDir: `${OUT_DIR}/${dir}`,
    shims: {
      deno: true,
    },
    package: {
      name,
      ...packageJsonFields,
    },
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
