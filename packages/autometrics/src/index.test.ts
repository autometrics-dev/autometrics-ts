import { autometrics } from "./index";
import { describe, test, expect, beforeAll } from "vitest";
import express from "express";

describe("Autometrics wrapper for functions", () => {
  beforeAll(() => {
    const app = express();
    const port = 8080;

    function rootRoute(req: express.Request, res: express.Response) {
      return res.status(200).send("Hello world");
    }

    app.get("/", autometrics(rootRoute));

    app.listen(port);
  });

  test("Test if /metrics endpoint on :9464 port returns metrics with instrumented func", async () => {
    const res = await fetch("http://localhost:8080/");
    expect(res.status).toEqual(200);
    expect(await res.text()).toEqual("Hello world");

    const metRes = await fetch("http://localhost:9464/metrics");
    const data = await metRes.text();

    const sample =
      'function_calls_count_total{function="rootRoute",result="ok"}';

    expect(metRes.status).toEqual(200);
    expect(isMetricRegistered(sample, data)).toBeTruthy();
  });
});

function isMetricRegistered(sample: string, data: string): boolean {
  const match = data.split("\n").find((line) => {
    const match = line.split(" ").find((str) => {
      if (str === sample) {
        return true;
      }
    });

    if (match) {
      return true;
    }
  });

  return match ? true : false;
}

