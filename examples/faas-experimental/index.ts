/**
 * This example should illustrate how you would use autometrics in a FaaS environment.
 *
 * If you need an aggregation gateway locally, try:
 *
    docker pull ghcr.io/zapier/prom-aggregation-gateway:v0.7.1
    docker run --platform linux/amd64 \
      -dit --name aggregation-gateway \
      -p 9092:80 \
      ghcr.io/zapier/prom-aggregation-gateway:v0.7.1
 *
 */

// NOTE - for now we need a fetch polyfill
//        this will already exist in the browser and in Deno, for what it's worth
import "./fetch-polyfill";
import { init as initAutometrics, autometrics } from "@autometrics/autometrics";

initAutometrics({
  // NOTE - The current default exporter does not play nicely with Prometheus Push Gateway,
  //        You'll end up with the error: "pushed metrics are invalid or inconsistent with existing metrics: pushed metrics must not have timestamps"
  //        However, it does work with aggregation gateways
  //
  pushGateway: "http://localhost:9092/metrics",
  pushInterval: 0,
});

// Create a getCheese function that returns "gouda"
const getGouda = autometrics(async function getGouda() {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return "gouda";
});

getGouda();
