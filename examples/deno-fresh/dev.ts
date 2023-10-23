#!/usr/bin/env -S deno run -A --watch=static/,routes/

import { init, AggregationTemporalityPreference } from "$autometrics/exporter-otlp-http.ts";
import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import "$std/dotenv/load.ts";

init({
  url: "http://localhost:4317/v1/metrics",
  temporalityPreference: AggregationTemporalityPreference.CUMULATIVE,
});

await dev(import.meta.url, "./main.ts", config);
