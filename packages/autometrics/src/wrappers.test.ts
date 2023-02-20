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


    expect(metRes.status).toEqual(200);
    expect(isMetricRegistered(data)).toBeTruthy();
  });
});

function isMetricRegistered(data: string): boolean {
	const sample = 'function_calls_duration_count{function="rootRoute"}';
	return data
		.split("\n")
		.some((line) => line.split(" ").some((str) => str === sample))
}

