import assert from "node:assert";
import test from "node:test";

import { AutometricsLegacy } from "@autometrics/autometrics";

import { collectAndSerialize, stepWithMetricReader } from "./test-utils.js";

test("legacy decorator test", async (t) => {
  await stepWithMetricReader(t, "class method", async (metricReader) => {
    // @Autometrics decorator is likely to be used along-side other decorators
    // this tests for any conflicts
    function bar(
      _target: Object,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;
      descriptor.value = originalMethod;
    }

    @AutometricsLegacy() class Foo {
      @bar
      helloWorld() {}
    }

    const foo = new Foo();
    foo.helloWorld();
    foo.helloWorld();

    const serialized = await collectAndSerialize(metricReader);

    assert.match(
      serialized,
      /function_calls_total\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\} 2/gm,
    );
    assert.match(
      serialized,
      /function_calls_duration_bucket\{\S*function="helloWorld"\S*module="\/packages\/exporter-prometheus\/tests\/integration.test.ts"\S*\}/gm,
    );
  });
});
