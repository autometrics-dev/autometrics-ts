![GitHub_headerImage](https://user-images.githubusercontent.com/3262610/221191767-73b8a8d9-9f8b-440e-8ab6-75cb3c82f2bc.png)

<div align="center">
<h1>Autometrics</h1>
<a href="https://github.com/autometrics-dev/autometrics-ts/actions?query=branch%3Amain"><img src="https://github.com/autometrics-dev/autometrics-ts/actions/workflows/check_wrappers.yml/badge.svg?event=push&branch=main" alt="Autometrics CI status" /></a>
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/npm/l/@autometrics/autometrics" alt="License"></a>
<a href="https://discord.gg/MJr7pYzZQ4" rel="nofollow"><img src="https://img.shields.io/discord/950489382626951178?label=Discord&logo=discord&logoColor=white" alt="discord server"></a>
</div>

> A TypeScript port of the Rust
> [autometrics-rs](https://github.com/fiberplane/autometrics-rs) library

**A library that makes it easy to understand the error rate, response time, and
production usage of any function in your code.** Jump straight from your IDE to
live Prometheus charts for each HTTP/RPC handler, database method, or other
piece of application logic.

Autometrics for TypeScript provides a wrapper function and a decorator that can
create Prometheus or OpenTelemetry metrics for your functions and class methods
throughout your code base, as well as a language service plugin that will write
corresponding Prometheus queries for you.

See [Why Autometrics?](https://github.com/autometrics-dev#why-autometrics) for
more details on the ideas behind autometrics

![AutometricsTS demo](./assets/autometrics-ts-demo.gif)

## Features

- ✨ `autometrics` wrapper instruments any function or class method to track the
  most useful metrics
- 🌳 Works in NodeJS server environments (Deno, serverless, and client support coming
  soon)
- 💡 Writes Prometheus queries so you can understand the data generated without
  knowing PromQL
- 🔗 Injects links to live Prometheus charts directly into each function's doc
  comments
- 📊 (Coming Soon!) Grafana dashboard showing the performance of all
  instrumented functions
- 🚨 (Coming Soon!) Generates Prometheus alerting rules using SLO best practices
  from simple annotations in your code
- ⚡ Minimal runtime overhead

## How it works

The Autometrics library:
- Automatically instruments your code with OpenTelemetry metrics
- Uses a Prometheus Exporter to write metrics to a `/metrics` endpoint (by
	default on port `:9464`)
- Uses the TypeScript plugin to automatically write useful Prometheus queries
	for instrumented functions and show them in the doc comments.

## Quickstart

```shell
npm install autometrics
```

Enable TypeScript plugin by adding it to `tsconfig.json`:

```json
{
  "compilerOptions": {
   ...
   "plugins": [
    {
     "name": "autometrics",
     "prometheusUrl": ""
    }
   ]
  }
}
```

Use the library in your code:

```typescript
import { autometrics } from "autometrics"
```

> **Note:** for VSCode users: make sure you select your VSCode TypeScript server
> to local to the project (where you have TypeScript installed in your
> `devDependencies`).
>
> In `.vscode/settings.json` set:
>
> ```json
> {
>   "typescript.tsdk": "node_modules/typescript/lib"
> }
> ```

### For projects already using OpenTelemetry metrics

The default `autometrics` package bundles `@opentelemetry/sdk-metrics` and
`@opentelemetry/exporter-prometheus` dependencies. If you are already using
these in your codebase or want to use other custom metrics, use this
installation option.

Install the wrappers, the language service plugin:

```shell
npm install --save @autometrics/autometrics
npm install --save-dev @autometrics/typescript-plugin
```

Add the language service plugin to the `tsconfig.json` file:

```json
{
 "compilerOptions": {
 ...
 "plugins": [
   {
    "name": "@autometrics/typescript-plugin",
    "prometheusUrl": ""
   }
  ]
 }
}
```

## Using wrappers and decorators

Use Autometrics wrappers to instrument the functions you want to track (e.g.:
request handlers or database calls).

### Adding function wrappers

Wrappers are simple functions that wrap the original function declaration
instrumenting it with metrics and allowing the language service plugin to add
additional information to the type docs.

Use function wrappers to wrap your request handlers, database calls, or other
pieces of important business logic that you want to measure.

> **Note**: wrapped functions must be named. Autometrics will throw an error if
> it can't access the name of the function.

Example:

```typescript
import { autometrics } from "autometrics";

async function createUser(payload: User) {
  // ...
}

// Now call the instrumented function as opposed to the original one
const user = autometrics(createUser)
```

> Note: if you're using the `@autometrics/autometrics` package instead of
> `autometrics`, import the helper functions from there:
> ```typescript
> import { autometrics } from "@autometrics/autometrics"
> ```

### Adding decorators for class methods

For class methods where a decorator is added, they are wrapped in additional
code that instruments it with OpenTelemetry metrics.

Here's a snippet from the example code:

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { autometricsDecorator as autometrics } from "autometrics";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @autometrics
  getHello(): string {
    return this.appService.getHello();
  }
}
```

### Getting the generated queries

Hover over any Autometrics-instrumented function or class to see the generated
queries. You can click on any of the links to go directly to the Prometheus
chart for that function.

![Autometrics demo](./assets/demo.png)

## Configuration

### Set your own Exporter

By default, autometrics exports your metrics with OpenTelemetry's Prometheus
Exporter on port `:9464`, endpoint `/metrics`. You can configure it as you wish,
however, by using the `setMetricsExporter` API.

Example if you want to set an exporter to port 7777:

```javascript
import { autometrics, setMetricsExporter } from "@autometrics/autometrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

const exporter = new PrometheusExporter({ port: 7777 });
setMetricsExporter(exporter);
```

### Language service plugin

Language service plugin can be configured in the `tsconfig.json` file.

#### Options

| key             | description                                                     |
| --------------- | --------------------------------------------------------------- |
| `name`          | always `autometrics` or `@autometrics/typescript-plugin`        |
| `prometheusUrl` | sets the base URL for PromQL queries. Default: `localhost:9090` |
