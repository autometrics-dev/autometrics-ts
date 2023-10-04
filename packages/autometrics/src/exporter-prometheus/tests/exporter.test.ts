// @deno-types="npm:@types/express@4.17.18"
import express, { Request, Response } from "npm:express@4.18.2";

import { autometrics } from "../../../mod.ts";
import { assertEquals, assertMatch } from "../../tests/deps.ts";
import { init } from "../mod.ts";

Deno.test("Autometrics wrapper for functions", async (t) => {
  init();

  const app = express();
  const port = 8080;

  function rootRoute(_req: Request, res: Response) {
    return res.status(200).send("Hello world");
  }

  app.get("/", autometrics(rootRoute));

  app.listen(port);

  await t.step(
    "Test if /metrics endpoint on :9464 port returns metrics with instrumented func",
    async () => {
      const res = await fetch("http://localhost:8080/");
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "Hello world");

      const metRes = await fetch("http://localhost:9464/metrics");
      assertEquals(metRes.status, 200);

      const data = await metRes.text();

      assertMatch(data, /function_calls_duration_count{function="rootRoute"/gm);
    },
  );
});
