# `@autometrics/exporter-prometheus`

Export metrics by opening up a Prometheus scrape endpoint.

This package will start a webserver on port 9464, with a Prometheus-compatible
`/metrics` endpoint.

You should configure your Prometheus instance to scrape this endpoint. For
instructions on how to do this, please refer to the Prometheus documentation:
https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config

## Documentation

Full documentation for the `autometrics` library can be found here:
https://github.com/autometrics-dev/autometrics-ts.

## Installation

```shell
# npm
npm install @autometrics/autometrics @autometrics/exporter-prometheus

# yarn
yarn add @autometrics/autometrics @autometrics/exporter-prometheus

# pnpm
pnpm add @autometrics/autometrics @autometrics/exporter-prometheus
```

## Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-prometheus";

init(); // starts the webserver with the `/metrics` endpoint on port 9464

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
   // ^ instrumented function
```

