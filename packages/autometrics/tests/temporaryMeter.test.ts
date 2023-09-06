import { describe, expect, test } from "vitest";

import { TemporaryMeter } from "../src/temporaryMeter";

describe("temporaryMeter test", () => {
  test("it disables itself after the timeout expires", async () => {
    const timeout = 50;

    const meter = new TemporaryMeter({ timeout });

    const counter = meter.createCounter("test.counter");
    counter.add(1);

    // @ts-ignore
    expect(meter._createdCounters.length).toBe(1);
    // @ts-ignore
    expect(counter._addedValues.length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, timeout));

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
