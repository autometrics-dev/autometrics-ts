![GitHub_headerImage](https://user-images.githubusercontent.com/3262610/221191767-73b8a8d9-9f8b-440e-8ab6-75cb3c82f2bc.png)

<div align="center">
<h1>Autometrics</h1>
<a href="https://github.com/autometrics-dev/autometrics-ts/actions?query=branch%3Amain"><img src="https://github.com/autometrics-dev/autometrics-ts/actions/workflows/ci.yml/badge.svg?event=push&branch=main" alt="Autometrics CI status" /></a>
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/npm/l/@autometrics/autometrics" alt="License"></a>
<a href="https://discord.gg/MJr7pYzZQ4" rel="nofollow"><img src="https://img.shields.io/discord/950489382626951178?label=Discord&logo=discord&logoColor=white" alt="discord server"></a>
</div>

<hr />

Autometrics library provides a wrapper for functions and decorator
for classes and methods to instrument them with the most useful
metrics: request rate, error rate, and latency. It then uses the instrumented
function names to generate Prometheus queries so you don’t need to hand-write
complicated PromQL.

[Learn more about Autometrics here](https://autometrics.dev/).


## Features

- ✨ `autometrics()` wrapper / `@Autometrics()` instruments any function or
class method to track its
  most useful metrics
- 🌳 Works in NodeJS, experimental support for browser and Deno environments
- 💡 Writes Prometheus queries so you can understand the data generated without
  knowing PromQL
- 🔗 Injects links to live Prometheus charts directly into each function's doc
- 🔍 Helps you to [identify commits](https://docs.autometrics.dev/typescript/adding-version-information) that introduced errors or increased latency
- 🚨 Allows you to [define alerts](https://docs.autometrics.dev/typescript/adding-alerts-and-slos) using SLO best practices directly in your source code
  comments
- 📊 [Grafana
dashboards](https://github.com/autometrics-dev/autometrics-shared#dashboards)
work out of the box and visualize the performance of instrumented functions &
SLOs
- ⚡ Minimal runtime overhead

## Example 

```typescript
import { autometrics } from "autometrics";

const createUserWithMetrics = autometrics(async function createUser(payload: User) {
  // ...
});

createUserWithMetrics();
```

![AutometricsTS demo](./assets/autometrics-ts-demo.gif)

## Quickstart

1. Install the library:

```bash
npm install --save autometrics
# or
yarn add --save autometrics
# or
pnpm add --save autometrics
```

2. Instrument your code using the `autometrics` wrapper or `Autometrics`
   decorator

```typescript
import { autometrics } from "autometrics";

const createUserWithMetrics = autometrics(async function createUser(payload: User) {
  // ...
});

createUserWithMetrics();
```

3. Configure Prometheus to scrape the data

By default the TypeScript library makes the metrics available on
`<your_host>:9464/metrics`. Make sure your Prometheus is configured correctly to
find it.

[See the docs](https://docs.autometrics.dev/configuring-prometheus/local) for
example Prometheus configuration.

4. Install the IDE extension

In order to get PromQL query links in your VSCode, download the [Autometrics VSCode
extension](https://marketplace.visualstudio.com/items?itemName=Fiberplane.autometrics).


<details>
    <summary>
    If you're on any other IDE you can install and add the TypeScript plugin
    directly:
    </summary>

```bash
npm install --save-dev @autometrics/typescript-plugin
```

Add the language service plugin to the `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@autometrics/typescript-plugin",
        "prometheusUrl": ""
      }
    ]
  }
}
```

</details>

## [Documentation](https://docs.autometrics.dev/typescript/quickstart)

## [API Reference](./packages/lib/reference/README.md)

## Contributing

Issues, feature suggestions, and pull requests are very welcome!

If you are interested in getting involved:
- Join the conversation on [Discord](https://discord.gg/9eqGEs56UB)
- Ask questions and share ideas in the [Github Discussions](https://github.com/orgs/autometrics-dev/discussions)
- Take a look at the overall [Autometrics Project Roadmap](https://github.com/orgs/autometrics-dev/projects/1)
