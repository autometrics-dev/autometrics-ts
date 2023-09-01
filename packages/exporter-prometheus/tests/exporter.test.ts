import { autometrics } from "@autometrics/autometrics";
import { describe, test, expect, beforeAll } from "vitest";
import express from "express";

import { init } from "../src";

describe("Autometrics wrapper for functions", () => {
  beforeAll(() => {
    init();

    const app = express();
    const port = 8080;

    function rootRoute(req: express.Request, res: express.Response) {
      return res.status(200).send("Hello world");
    }

    app.get("/", autometrics(rootRoute));

    app.listen(port);
  });

  test("Test if /metrics endpoint on :9464 port returns metrics with instrumented func", async () => {
    const countMetric = /function_calls_duration_count{function="rootRoute"/gm;

    const res = await fetch("http://localhost:8080/");
    expect(res.status).toEqual(200);
    expect(await res.text()).toEqual("Hello world");

    const metRes = await fetch("http://localhost:9464/metrics");
    expect(metRes.status).toEqual(200);

    const data = await metRes.text();

    expect(data).toMatch(countMetric);
  });
});
