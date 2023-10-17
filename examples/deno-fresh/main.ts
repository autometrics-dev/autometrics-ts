/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";

import { init, AggregationTemporalityPreference } from "$autometrics/exporter-otlp-http.ts";
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

init({
  url: "http://localhost:4317/v1/metrics",
  temporalityPreference: AggregationTemporalityPreference.CUMULATIVE,
});

await start(manifest, config);
