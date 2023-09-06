import { describe, expect, test } from "vitest";

import { TemporaryMeter } from "../src/temporaryMeter";

// the existing getModulePath function is a hack that parses the stack trace
// as string and extracts the module path from it. This test is to ensure that
// the function works as expected
describe("temporaryMeter test", () => {
  test("it disables itself after the timeout expires", async () => {
    const meter = new TemporaryMeter({ timeout: 50 });

    const counter = meter.createCounter("test.counter");
    counter.add(1);

    // @ts-ignore
    expect(meter._createdCounters.length).toBe(1);
    // @ts-ignore
    expect(counter._addedValues.length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // @ts-ignore
    expect(meter._createdCounters.length).toBe(0);
    // @ts-ignore
    expect(counter._addedValues.length).toBe(0);

    counter.add(1);

    // @ts-ignore
    expect(meter._createdCounters.length).toBe(0);
    // @ts-ignore
    expect(counter._addedValues.length).toBe(0);
  });
});
