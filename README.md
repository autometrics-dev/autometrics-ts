# Autometrics

> Understand your system easily using automatically generated metrics and pre-built Prometheus queries.

Autometrics for Typescript provides a JSDoc tag for instrument functions throughout your code base.
It creates metrics for you and then offers customized Prometheus queries for you to run to observe your system in production.

Autometrics currently generates the following queries for each instrumented function:

- Request rate
- Error rate
- Latency (95th and 99th percentiles)

## Autometrics in Typescript 

TODO:

- [ ] Async function supported
- [ ] Prometheus exporter configurability

You can add autometrics to Typescript class methods and functions by using decorators and wrappers.

### Adding decorators

Decorators can be added to class methods (only methods supported for now). Decorators can have arguments (currently not supported). They can also be nested (autometrics decorator should come last)

For methods where a decorator is added, they are wrapped in additional code that instruments it with a histogram and counter.

Here's a snippet from the example code:

```diff
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
+ import { Autometrics } from "autometrics-decorators";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
+ @Autometrics
  getHello(): string {
    return this.appService.getHello();
  }
}
```

### Adding wrappers

Wrappers are simple functions that wrap the original function declaration instrumenting it with a histogram and counter, while preserving the original type signature (your type docs on hover will not be touched).

Call the wrapped function if you want to get its metrics.

```diff
+ import { autometrics } from "autometrics-decorators";

function createBye() {
  return "bye"
}

+ const createByeMetrics = autometrics(createBye)
+
+ // Now call the instrumented function as opposed to the original one
+
+ createByeMetrics()
```

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
