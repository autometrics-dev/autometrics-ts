# AutometricsTS 📈✨

![AutometricsTS demo](./assets/autometrics-ts-demo.gif)

> A TypeScript port of the Rust
> [autometrics-rs](https://github.com/fiberplane/autometrics-rs) library

**A library that makes it easy to understand the error rate, response time, and
production usage of any function in your code.** Jump straight from your IDE to
live Prometheus charts for each HTTP/RPC handler, database method, or other
piece of application logic.


Autometrics for Typescript provides a wrapper function and a decorator that can
create Prometheus or OpenTelemetry metrics for your functions and class methods
throughout your code base, as well as a language service plugin that will write
corresponding Prometheus queries for you.

See [Why Autometrics?](https://github.com/autometrics-dev#why-autometrics) for
more details on the ideas behind autometrics

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

The AutometricsTS library consists of two parts:

#### The wrappers and decorators:

- Automatically instruments your code with OpenTelemetry metrics
- Uses a Prometheus Exporter to write metrics to a `/metrics` endpoint (by
  default on port `:9464`)

#### The language service plugin:
- Automatically writes useful Prometheus queries for instrumented functions and
  shows them in the doc comments.


## Getting started

### 1. Install and setup the library and the language service plugin

Install the wrappers, the language service plugin, and the peer dependencies:

```shell
npm install --save @autometrics/autometrics
npm install --save-dev @autometrics/typescript-plugin
npm install --save @opentelemetry/sdk-metrics @opentelemetry/exporter-prometheus
```

Add the language service plugin to the `tsconfig.json` file:

```diff
{
    "compilerOptions": {
       ...
+        "plugins": [{
+            "name": "@autometrics/typescript-plugin",
+            "prometheusUrl": ""
+        }]
    },
	...
}
```

> **Note:** If on VSCode: make sure you select your VSCode Typescript server to local to
> the project (where you have Typescript installed in your `devDependencies`).
> 
> In `.vscode/settings.json` set:
> ```json
> {
>     "typescript.tsdk": "node_modules/typescript/lib"
> }
> ```


### 2. Wrap functions or decorate class methods

Use Autometrics wrappers to instrument the functions you want to track (e.g.:
request handlers or database calls).

#### Adding wrappers

Wrappers are simple functions that wrap the original function declaration
instrumenting it with metrics and allowing the language service plugin to add
additional information to the type docs.

Call the wrapped function to get metrics for the .

```diff
+ import { autometrics } from "@autometrics/autometrics";

async function createUser(payload: User) {
  // ...
}

+ // Now call the instrumented function as opposed to the original one
+ const user = autometrics(createUser)
```

#### Adding decorators

For class methods where a decorator is added, they are wrapped in additional code that
instruments it with OpenTelemetry metrics.

Here's a snippet from the example code:

```diff
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
+ import { autometricsDecorator as autometrics } from "@autometrics/autometrics";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
+ @autometrics
  getHello(): string {
    return this.appService.getHello();
  }
}
```

### 3. Hover over the function name to see the generated queries

You can click on any of the links to go directly to the Prometheus chart for
that function.

![Autometrics demo](./assets/demo.png)


## Configuration

### Set your own Exporter

By default, autometrics exports your metrics with OpenTelemetry's Prometheus
Exporter on port `:9464`, endpoint `/metrics`. You can configure it as you wish,
however, by using the `setMetricsExporter` API.

Example:

```javascript
import { autometrics, setMetricsExporter} from "@autometrics/autometrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

const exporter = new PrometheusExporter({ port: 7777 });
setMetricsExporter(exporter);

```

### Language service plugin

Language service plugin can be configured in the `tsconfig.json` file.

#### Options

|key |description |
|---|---|
| `name` | always `@autometrics/docs` |
| `prometheusUrl` | sets the base URL for PromQL queries. Default: `localhost:9090` |

