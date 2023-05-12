# `@autometrics/autometrics` 📈✨

## Documentation

Full documentation for `@autometrics/autometrics` library can be found
[here](https://github.com/autometrics-dev/autometrics-ts).

## Installation: autometrics and peer dependencies

```shell
# npm
npm install @autometrics/autometrics @opentelemetry/sdk-metrics
@opentelemetry/exporter-prometheus

# yarn
yarn add @autometrics/autometrics @opentelemetry/sdk-metrics
@opentelemetry/exporter-prometheus

# pnpm
pnpm add @autometrics/autometrics @opentelemetry/sdk-metrics
@opentelemetry/exporter-prometheus
```

## Basic example

```typescript
import { autometrics } from "@autometrics/autometrics";

async function createUser(payload: User) {
  // ...
}

const user = autometrics(createUser);
    // ^ instrumented function
```
