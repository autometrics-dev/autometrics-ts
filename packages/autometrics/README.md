# `@autometrics/autometrics` 📈✨

This is the official TypeScript implementation for https://autometrics.dev/.

## Documentation

Full documentation for the `@autometrics/autometrics` library can be found
here: https://github.com/autometrics-dev/autometrics-ts

## Recipe: Server-side example with Prometheus

### Installation

```shell
# npm
npm install @autometrics/autometrics @autometrics/exporter-prometheus

# yarn
yarn add @autometrics/autometrics @autometrics/exporter-prometheus

# pnpm
pnpm add @autometrics/autometrics @autometrics/exporter-prometheus
```

### Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-prometheus";

init(); // starts the webserver with the `/metrics` endpoint on port 4964

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```

## Recipe: Client-side example with the OpenTelemetry Collector

### Installation

```shell
# npm
npm install @autometrics/autometrics @autometrics/exporter-otlp-http

# yarn
yarn add @autometrics/autometrics @autometrics/exporter-otlp-http

# pnpm
pnpm add @autometrics/autometrics @autometrics/exporter-otlp-http
```

### Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-otlp-http";

init({ url: "https://<your-otel-collector>" });

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```
