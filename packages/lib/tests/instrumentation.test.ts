import { assertEquals } from "./deps.ts";
import { getMetricsProvider } from "../src/instrumentation.ts";

Deno.test("Autometrics initializer", async (t) => {
  await t.step("Test if autometrics initializes only once", () => {
    assertEquals(getMetricsProvider(), getMetricsProvider());
  });
});
