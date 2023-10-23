# `@autometrics/autometrics` 📈✨

This is the official TypeScript implementation for https://autometrics.dev/.

## Documentation

Full documentation for the `@autometrics/autometrics` library can be found here:
https://github.com/autometrics-dev/autometrics-ts

## Recipe: Server-side example with Prometheus

This recipe will start a webserver on port 9464, with a Prometheus-compatible
`/metrics` endpoint.

You should configure your Prometheus instance to scrape this endpoint. For
instructions on how to do this, please refer to the Prometheus documentation:
https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config

### Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "https://deno.land/x/autometrics/mod.ts";
import { init } from "https://deno.land/x/autometrics/exporter-prometheus.ts";

init(); // starts the webserver with the `/metrics` endpoint on port 9464

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
//    ^ instrumented function
```

## Recipe: Edge example with the OpenTelemetry Collector

For this exporter to work, you need to have an Otel Collector running, see:
https://opentelemetry.io/docs/collector/getting-started/

### Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "https://deno.land/x/autometrics/mod.ts";
import { init } from "https://deno.land/x/autometrics/exporter-otlp-http.ts";

init({ url: "https://<your-otel-collector>" });

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
//    ^ instrumented function
```

## Recipe: Edge example with the Prometheus Push Gateway

For this exporter to work, you need to have a Prometheus-compatible push
gateway, such as: https://github.com/sinkingpoint/prometheus-gravel-gateway

### Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "https://deno.land/x/autometrics/mod.ts";
import { init } from "https://deno.land/x/autometrics/exporter-prometheus-push-gateway.ts";

init({ url: "https://<your-otel-collector>" });

async function createUserRaw(payload: User) {
  // ...
}

const createUser = autometrics(createUserRaw);
//    ^ instrumented function
```
