import { getMetricsProvider } from "./instrumentation";
import { describe, test, expect, } from "vitest";

describe("Autometrics initializer", () => {

  test("Test if autometrics initializes only once", () => {
		expect(getMetricsProvider()).to.equal(getMetricsProvider())
  });
});

