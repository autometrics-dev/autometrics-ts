# `@autometrics/exporter-otlp-http`

Export metrics by pushing them to an OpenTelemetry Collector.

For this exporter to work, you need to have an Otel Collector running, see:
https://opentelemetry.io/docs/collector/getting-started/

## Documentation

Full documentation for the `autometrics` library can be found here:
https://github.com/autometrics-dev/autometrics-ts.

## Installation

```shell
# npm
npm install @autometrics/autometrics @autometrics/exporter-otlp-http

# yarn
yarn add @autometrics/autometrics @autometrics/exporter-otlp-http

# pnpm
pnpm add @autometrics/autometrics @autometrics/exporter-otlp-http
```

## Usage

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
