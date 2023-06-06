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

- ✨ `autometrics()` wrapper / `@Autometrics()` instruments any function or class method to track its
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
```

3. Configure Prometheus to scrape the data

By default the TypeScript library makes the metrics available on
`<your_host>:9464/metrics`. Make sure your Prometheus is configured correctly to
find it.

4. Install the IDE extension

In order to get PromQL query links in your VSCode, download the [Autometrics VSCode
extension](https://marketplace.visualstudio.com/items?itemName=Fiberplane.autometrics).

If you're on any other IDE you can install and add the TypeScript plugin
directly:

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


[See the docs](https://docs.autometrics.dev/configuring-prometheus/local) for
example Prometheus configuration.

## Using wrappers and decorators in NodeJS

Use Autometrics wrappers to instrument the functions you want to track (e.g.:
request handlers or database calls).

### Wrapping plain-old functions

Wrappers are simple functions that wrap the original function declaration and
instrument it with metrics. They allow the language service plugin to add
additional information in the type docs.

Use function wrappers to wrap request handlers, database calls, or other
pieces of important business logic that you want to measure.

> **Note**: Wrapped functions must be named. Autometrics will throw an error if
> it can't access the name of the function.

Example:

```typescript
import { autometrics } from "autometrics";

const createUserWithMetrics = autometrics(async function createUser(payload: User) {
  // ...
});

createUserWithMetrics();
```

### Decorating class methods

When using a decorator for a class method, it is wrapped in additional code that
instruments the method with OpenTelemetry metrics.

Here's a snippet from a NestJS example project that uses Autometrics:

```typescript
import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { Autometrics } from "autometrics";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Autometrics()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

Alternatively, you can apply the same decorator to the entire class and
instrument all of its methods:

```typescript
// ...
@Autometrics()
export class AppController {
  // ...
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```


## Using wrappers in the browser (Experimental)

> **Note**
> Support for client-side use of the Autometrics library is still early and
> experimental.

### Set up the push gateway

In order for Prometheus to succesfully get your client-side app metrics, you
will need to push them to an aggregating push gateway [like this
one](https://github.com/zapier/prom-aggregation-gateway).

Use the `init` function to configure the gateway URL that Autometrics should
push the data to. You can also set the push interval with the `pushInterval`
property (default is every 5000 miliseconds);

```typescript
init({ pushGateway: "<link_to_gateway>" });
```

### Use Autometrics wrapper with options

The same wrapper functions can be used in browser environments. Note that
bundlers often change the names of functions and modules in production, which
can impact the library.

To get around this issue, wrappers accept an options object as
their first argument, which explicitly assigns a function and module name.

```typescript
const myFunction = autometrics(
  {
    functionName: "myFunction",
    moduleName: "Module",
  },
  async () => {
    // ... myFunction body
  }
);
```

## Configuration

### Set your own Exporter

By default, autometrics exposes your metrics with OpenTelemetry's Prometheus
Exporter on port `:9464`, using the endpoint `/metrics`. You can configure it as you wish,
however, by using the `init` function.

Here is an example that sets the exporter to use port 7777:

```javascript
import { autometrics, init } from "@autometrics/autometrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

const exporter = new PrometheusExporter({ port: 7777 });
init({ exporter });
```

### Language service plugin

The language service plugin can be configured in the `tsconfig.json` file.

#### Options

| key             | description                                                     |
| --------------- | --------------------------------------------------------------- |
| `name`          | always `@autometrics/typescript-plugin`                         |
| `prometheusUrl` | sets the base URL for PromQL queries. Default: `localhost:9090` |
