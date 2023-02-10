# AutometricsTS 📈

**AutometricsTS is a library that makes it trivial to add useful metrics and see performance of any function or method in your codebase**

> A TypeScript port of the Rust [autometrics-rs](https://github.com/fiberplane/autometrics-rs) library

Autometrics for Typescript provides a wrapper function and a decorator that can create OpenTelemetry metrics for your functions and class methods throughout your code base, as well as a language service plugin that will write corresponding Prometheus queries for you.

Currently Autometrics only works on the server with NodeJS. We're looking into extending support for Deno, other runtimes, and the client.

## How it works

The AutometricsTS library consists of two parts:
- the wrapper and decorator helpers
- the language service plugin

The wrappers and decorators:
- Automatically instruments your code with OpenTelemetry metrics
- Uses a Prometheus Exporter to write metrics to a `/metrics` endpoint (by default on port `:9464`)

The language service plugin:
- Automatically writes useful Prometheus queries for instrumented functions and shows them in the doc comments.


### 1. Install and setup the library and the language service plugin

Install both the helpers and the language service plugin using these commands:

```shell
npm install --save autometrics
npm install --save-dev autometrics-docs
```

Add the language service plugin to the `tsconfig.json` file:

```diff
{
    "compilerOptions": {
       ...
+        "plugins": [{
+            "name": "autometrics-docs",
+            "prometheusUrl": "" // localhost:9090 by default
+        }]
    },
	...
}
```

> **⚠️ Note** 
> 
> If on VSCode: make sure you select your VSCode Typescript server to local to the project (where you have Typescript installed in your `devDependencies`).
>
> ```json
> // .vscode/settings.json
>{
>    "typescript.tsdk": "node_modules/typescript/lib"
>}
> ```

### 2. Wrap functions or decorate class methods

Use Autometrics wrappers to instrument the functions you want to track (e.g.: request handlers or database calls).


#### Adding wrappers

Wrappers are simple functions that wrap the original function declaration instrumenting it with metrics and allowing the language service plugin to add additional information to the type docs.

Call the wrapped function to get metrics for the .

```diff
+ import { autometrics } from "autometrics";

function createHello() {
  return "hello"
}

+ // Now call the instrumented function as opposed to the original one
+ const hello = autometrics(createHello)
```

### Adding decorators

For methods where a decorator is added, they are wrapped in additional code that instruments it with OpenTelemetry metrics.

Here's a snippet from the example code:

```diff
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
+ import { autometricsDecorator as autometrics } from "autometrics";

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

You can click on any of the links to go directly to the Prometheus chart for that function.

![picture: Generated queries inside doc comments](assets/hover.png)
