import { getInitConfigFromEnv } from "../src/config";
import { describe, test, expect, beforeAll, afterEach } from "vitest";

// Restore the original environment variables after each test
let originalEnv: NodeJS.ProcessEnv;
beforeAll(() => {
  originalEnv = process.env;
});
afterEach(() => {
  process.env = originalEnv;
});

describe("Autometrics configuration from environment vars", () => {
  test("returns empty object when no environment vars present", () => {
    expect(getInitConfigFromEnv()).to.be.empty;
  });

  test("returns correct pushGateway when PROMETHEUS_PUSHGATEWAY_URL is present", () => {
    process.env.PROMETHEUS_PUSHGATEWAY_URL = "http://localhost:9091";
    expect(getInitConfigFromEnv()).to.have.property("pushGateway");
    expect(getInitConfigFromEnv().pushGateway).to.equal(
      "http://localhost:9091",
    );
  });

  test("returns correct pushInterval when PROMETHEUS_PUSHGATEWAY_INTERVAL is present and an integer", () => {
    process.env.PROMETHEUS_PUSHGATEWAY_INTERVAL = "90000";
    expect(getInitConfigFromEnv()).to.have.property("pushInterval");
    expect(getInitConfigFromEnv().pushInterval).to.equal(90000);
  });

  test("does not set pushInterval when PROMETHEUS_PUSHGATEWAY_INTERVAL is not an integer", () => {
    process.env.PROMETHEUS_PUSHGATEWAY_INTERVAL = "xyz";
    expect(getInitConfigFromEnv()).not.to.have.property("pushInterval");
  });
});
