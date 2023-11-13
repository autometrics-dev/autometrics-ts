![GitHub_headerImage](https://user-images.githubusercontent.com/3262610/221191767-73b8a8d9-9f8b-440e-8ab6-75cb3c82f2bc.png)

<div align="center">
<h1>Autometrics</h1>
<a href="https://github.com/autometrics-dev/autometrics-ts/actions?query=branch%3Amain"><img src="https://github.com/autometrics-dev/autometrics-ts/actions/workflows/ci.yml/badge.svg?event=push&branch=main" alt="Autometrics CI status" /></a>
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/npm/l/@autometrics/autometrics" alt="License"></a>
<a href="https://discord.gg/MJr7pYzZQ4" rel="nofollow"><img src="https://img.shields.io/discord/950489382626951178?label=Discord&logo=discord&logoColor=white" alt="discord server"></a>
</div>

<hr />

Metrics are a powerful and cost-efficient tool for understanding the health and performance of your code in production. But it's hard to decide what metrics to track and even harder to write queries to understand the data.

Autometrics provides a wrapper function and decorator to instrument functions, classes, and methods with the most useful metrics: request rate, error rate, and latency. It standardizes these metrics and then generates powerful Prometheus queries based on your function details to help you quickly identify and debug issues in production.

[Learn more about Autometrics at autometrics.dev](https://autometrics.dev/).

## Benefits

- ✨ `autometrics()` wrapper / `@Autometrics()` decorator instruments any function or class method to track its most useful metrics
- 🌳 Works in Deno, NodeJS and browser environments [(*)](#known-issues)
- 💡 Writes Prometheus queries so you can understand the data generated without knowing PromQL
- 🔗 Injects links to live Prometheus charts directly into each function's doc
- 🔍 Helps you to [identify commits](https://docs.autometrics.dev/typescript/adding-version-information) that introduced errors or increased latency
- 📊 [Grafana dashboards](https://github.com/autometrics-dev/autometrics-shared#dashboards) work out of the box and visualize the performance of instrumented functions & SLOs
- ⚡ Minimal runtime overhead

### Known issues

- Pushing metrics from client-side and FaaS environments is currently experimental.

## Advanced Features
- 🚨 Allows you to [define alerts](https://docs.autometrics.dev/typescript/adding-alerts-and-slos) using SLO best practices directly in your source code comments

## Example

```ts
import { autometrics } from "@autometrics/autometrics";

const createUserWithMetrics = autometrics(async function createUser(payload: User) {
  // ...
});

createUserWithMetrics();
```

![AutometricsTS demo](./assets/autometrics-ts-demo.gif)

## Quickstart with Node.js and Prometheus

(See the [recipes](#recipes) below for other setup scenarios.)

1. **Install the library**

```sh
npm install @autometrics/autometrics @autometrics/exporter-prometheus
# or
yarn add @autometrics/autometrics @autometrics/exporter-prometheus
# or
pnpm add @autometrics/autometrics @autometrics/exporter-prometheus
```

2. **Instrument your code using the `autometrics` wrapper or `Autometrics` decorator**

```ts
import { autometrics } from "@autometrics/autometrics";

const createUserWithMetrics = autometrics(async function createUser(payload: User) {
  // ...
});

createUserWithMetrics();
```

```ts
import { Autometrics } from "@autometrics/autometrics";

class User {
  @Autometrics()
  async createUser(payload: User) {
    // ...
  }
}
```

3. **Call `init()` to set up a Prometheus scrape endpoint**

This endpoint will serve to export the metrics from your application and allows
them to be scraped by Prometheus.

```ts
import { init } from "@autometrics/exporter-prometheus";

init(); // starts the webserver with the `/metrics` endpoint on port 9464
```

3. **Run Prometheus locally to validate and preview the data**

You can use the open source Autometrics CLI to run automatically configured Prometheus locally to see the metrics that will be registered by the change. See the [Autometrics CLI docs](https://docs.autometrics.dev/local-development#getting-started-with-am) for more information.

or you can configure Prometheus manually:

```yaml
scrape_configs:
  - job_name: my-app
    metrics_path: /metrics # The default path for the Autometrics Prometheus exporter
    static_configs:
      - targets: ['localhost:9464'] # The default port for the Autometrics Prometheus exporter
    scrape_interval: 200ms
    # For a real deployment, you would want the scrape interval to be
    # longer but for testing, you want the data to show up quickly
```

[See the docs](https://docs.autometrics.dev/configuring-prometheus/local) for more Prometheus configurations.

4. **Install the IDE extension**

In order to get charts in VSCode, download the [Autometrics VSCode extension](https://marketplace.visualstudio.com/items?itemName=Fiberplane.autometrics).

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

## Recipes

Below are different recipes for using Autometrics with a server-side setup and
edge/client-side setups. If you would like to see examples with specific
frameworks, please have a look at the [examples/](examples/) directory.

### Server-side example with Prometheus

#### Installation

```sh
npm install @autometrics/autometrics @autometrics/exporter-prometheus
# or
yarn add @autometrics/autometrics @autometrics/exporter-prometheus
# or
pnpm add @autometrics/autometrics @autometrics/exporter-prometheus
```

#### Usage

1. Anywhere in your source code:

```ts
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-prometheus";

init(); // starts the webserver with the `/metrics` endpoint on port 9464

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```

### Recipe: Edge/Client-side example with a Prometheus Push Gateway

#### Installation

```sh
npm install @autometrics/autometrics @autometrics/exporter-prometheus-push-gateway
# or
yarn add @autometrics/autometrics @autometrics/exporter-prometheus-push-gateway
# or
pnpm add @autometrics/autometrics @autometrics/exporter-prometheus-push-gateway
```

#### Usage

1. Anywhere in your source code:

```ts
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-prometheus-push-gateway";

init({ url: "https://<your-push-gateway>" });

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```

### Recipe: Edge/Client-side example with the OpenTelemetry Collector

#### Installation

```sh
npm install @autometrics/autometrics @autometrics/exporter-otlp-http
# or
yarn add @autometrics/autometrics @autometrics/exporter-otlp-http
# or
pnpm add @autometrics/autometrics @autometrics/exporter-otlp-http
```

#### Usage

1. Anywhere in your source code:

```ts
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-otlp-http";

init({ url: "https://<your-otel-collector>" });

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```

## Contributing

Issues, feature suggestions, and pull requests are very welcome!

If you are interested in getting involved:
- Join the conversation on [Discord](https://discord.gg/9eqGEs56UB)
- Ask questions and share ideas in the [Github Discussions](https://github.com/orgs/autometrics-dev/discussions)
- Take a look at the overall [Autometrics Project Roadmap](https://github.com/orgs/autometrics-dev/projects/1)
