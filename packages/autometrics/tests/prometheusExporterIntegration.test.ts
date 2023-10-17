import { assertEquals, assertMatch } from "$std/assert/mod.ts";

// @deno-types="npm:@types/express@4.17.18"
import express, { Request, Response } from "npm:express@4.18.2";

import { autometrics } from "../mod.ts";
import { init, stop } from "../src/exporter-prometheus/mod.ts";

Deno.test("Prometheus exporter integration with Express", async (t) => {
  await t.step(
    "/metrics endpoint on port 9464 returns metrics for instrumented function",
    async () => {
      // Setup.
      init();

      const app = express();
      const port = 8080;

      function rootRoute(_req: Request, res: Response) {
        return res.status(200).send("Hello world");
      }

      app.get("/", autometrics(rootRoute));

      const server = app.listen(port);

      // Trigger metrics by calling instrumented endpoint.
      const res = await fetch(`http://localhost:${port}/`);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "Hello world");

      // Fetch Prometheus metrics from the `/metrics` scrape endpoint.
      const metricsResult = await fetch("http://localhost:9464/metrics");
      assertEquals(metricsResult.status, 200);

      const data = await metricsResult.text();
      assertMatch(data, /function_calls_duration_count{function="rootRoute"/gm);

      // Teardown.
      await new Promise((resolve) => server.close(resolve));

      await stop();
    },
  );
});
