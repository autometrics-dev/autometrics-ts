import { assertEquals } from "./deps.ts";
import { TemporaryMeter } from "../temporaryMeter.ts";

Deno.test("temporaryMeter test", async (t) => {
  await t.step("it disables itself after the timeout expires", async () => {
    const timeout = 50;

    const meter = new TemporaryMeter({ timeout });

    const counter = meter.createCounter("test.counter");
    counter.add(1);

    // @ts-expect-error Testing a private field.
    assertEquals(meter._createdCounters.length, 1);

    // @ts-ignore Testing a private field.
    assertEquals(counter._addedValues.length, 1);

    await new Promise((resolve) => setTimeout(resolve, timeout));

    // @ts-expect-error Testing a private field.
    assertEquals(meter._createdCounters.length, 0);

    // @ts-ignore Testing a private field.
    assertEquals(counter._addedValues.length, 0);

    counter.add(1);

    // @ts-expect-error Testing a private field.
    assertEquals(meter._createdCounters.length, 0);

    // @ts-ignore Testing a private field.
    assertEquals(counter._addedValues.length, 0);
  });
});
