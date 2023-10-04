# `@autometrics/exporter-prometheus-push-gateway`

Export metrics by pushing them to a Prometheus-compatible push gateway.

For this exporter to work, you need to have a Prometheus-compatible push
gateway, such as: https://github.com/sinkingpoint/prometheus-gravel-gateway

## Documentation

Full documentation for the `autometrics` library can be found here:
https://github.com/autometrics-dev/autometrics-ts.

## Installation

```shell
# npm
npm install @autometrics/autometrics @autometrics/exporter-prometheus-push-gateway

# yarn
yarn add @autometrics/autometrics @autometrics/exporter-prometheus-push-gateway

# pnpm
pnpm add @autometrics/autometrics @autometrics/exporter-prometheus-push-gateway
```

## Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-prometheus-push-gateway";

init({ url: "https://<your-push-gateway>" });

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```
