import { Autometrics } from "@autometrics/autometrics";
import { describe, expect, test } from "vitest";

import { init } from "../src/index";
import { metricReader } from "../src/registerExporterInternal";

@Autometrics()
class Foo {
  bar() {}
}

// make sure that metrics that are collected before `init()` is called are
// correctly tracked.
describe("init test", () => {
  test("collects metrics recorded before init was called", async () => {
    const foo = new Foo();
    foo.bar(); // one before

    init({ url: "/metrics", pushInterval: 0 });

    foo.bar(); // one after

    const collectionResult = await metricReader?.collect();

    expect(
      collectionResult?.resourceMetrics.scopeMetrics,
    ).toMatchInlineSnapshot(`
      [
        {
          "metrics": [
            {
              "aggregationTemporality": 1,
              "dataPointType": 0,
              "dataPoints": [
                {
                  "attributes": {
                    "caller": undefined,
                    "function": "bar",
                    "module": "/packages/exporter-otlp-http/tests/init.test.ts",
                    "objective_latency_threshold": "",
                    "objective_name": "",
                    "objective_percentile": "",
                  },
                  "endTime": [
                    1693842584,
                    627000000,
                  ],
                  "startTime": [
                    1693842584,
                    621000000,
                  ],
                  "value": {
                    "buckets": {
                      "boundaries": [
                        0,
                        0.005,
                        0.01,
                        0.025,
                        0.05,
                        0.075,
                        0.1,
                        0.25,
                        0.5,
                        0.75,
                        1,
                        2.5,
                        5,
                        7.5,
                        10,
                      ],
                      "counts": [
                        0,
                        1,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                      ],
                    },
                    "count": 2,
                    "max": 0.0007790059894323349,
                    "min": 0.0007790059894323349,
                    "sum": 0.0007790059894323349,
                  },
                },
              ],
              "descriptor": {
                "description": "Autometrics histogram for tracking function call duration",
                "name": "function.calls.duration",
                "type": "HISTOGRAM",
                "unit": "seconds",
                "valueType": 1,
              },
            },
            {
              "aggregationTemporality": 1,
              "dataPointType": 3,
              "dataPoints": [
                {
                  "attributes": {
                    "branch": "",
                    "clearmode": "",
                    "commit": "",
                    "version": "",
                  },
                  "endTime": [
                    1693842584,
                    627000000,
                  ],
                  "startTime": [
                    1693842584,
                    627000000,
                  ],
                  "value": 1,
                },
              ],
              "descriptor": {
                "description": "Autometrics info metric for tracking software version and build details",
                "name": "build_info",
                "type": "UP_DOWN_COUNTER",
                "unit": "",
                "valueType": 1,
              },
              "isMonotonic": false,
            },
          ],
          "scope": {
            "name": "autometrics",
            "schemaUrl": undefined,
            "version": "",
          },
        },
      ]
    `);
  });
});
