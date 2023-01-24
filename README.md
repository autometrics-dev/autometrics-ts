# Autometrics
> Understand your system easily using automatically generated metrics and pre-built Prometheus queries.

Autometrics for Typescript provides a JSDoc tag for instrument functions throughout your code base.
It creates metrics for you and then offers customized Prometheus queries for you to run to observe your system in production.

Autometrics currently generates the following queries for each instrumented function:
- Request rate
- Error rate
- Latency (95th and 99th percentiles)
- Concurrent requests

## Autometrics in Typescript

Unlike [Rust](github.com/fiberplane/autometrics-rs), Typescript (Javascript) does not have a language-built paradigm for compile-time code (macros). In the current prototype of autometrics for Typescript we're making use of two instruments:
- build step to inject the instrumentation code;
- language service plugin to show LSP documentation screens on instrumented functions.

> NOTE: this is very much a prototype stage still (full of FIXMEs and hardcoded assumptions)

### Adding build step: Rollup plugin

Known issues:
- the official [@rollup/plugin-typescript](https://www.npmjs.com/package/@rollup/plugin-typescript) strips out the JSDoc comments before the `autometrics` plugin can kick in, rendering it useless. Still investigating.

The first prototype of autometrics is built using the Rollup bundler. To add autometrics to your rollup config:

1. `npm install` the library `autometrics-ts/packages/rollup`
2. In `rollup.config.ts` file:

```diff
import typescript from "rollup-plugin-typescript2";
+ import autometrics from "rollup-plugin-autometrics";

export default {
	input: "src/index.ts",
	output: {
		file: "dist/bundle.js",
		format: "cjs",
	},

	plugins: [
+		autometrics(), 
		typescript()
	],
};

```

3. You can now instrument your functions using `@autometrics` JSDoc tag (note: they must be root level function declarations)

### Adding language service plugin

In order to render Prometheus query helpers on hover you need to set up the language service plugin.

1. Install `autometrics-ts/packages/autometrics-docs` package
2. In `tsconfig.json`:

```diff

{
    "compilerOptions": {
       ...
+        "plugins": [{
+            "name": "autometrics-docs"
+        }]
    },
	...
}

```

3. Make sure you select your VSCode Typescript server to local to the project (where you have Typescript installed in your `devDependencies`)
