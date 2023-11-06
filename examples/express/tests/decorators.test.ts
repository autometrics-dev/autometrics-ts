import assert from "node:assert";
import test from "node:test";

import { AutometricsLegacy } from "@autometrics/autometrics";

import { collectAndSerialize, stepWithMetricReader } from "./test-utils.js";

test("Legacy decorator test", async (t) => {
  await stepWithMetricReader(t, "class methods", async (metricReader) => {
    // @Autometrics decorator is likely to be used along-side other decorators
    // this tests for any conflicts
    function other(
      _target: Object,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;
      descriptor.value = originalMethod;
    }

    @AutometricsLegacy() class Foo {
      counter = 0;

      @other
      increase() {
        this.counter += 1;
        return this.counter;
      }

      @AutometricsLegacy({ skip: true })
      untrackedDecrease() {
        this.counter -= 1;
        return this.counter;
      }
    }

    const foo = new Foo();
    assert.strictEqual(foo.increase(), 1);
    assert.strictEqual(foo.increase(), 2);

    assert.strictEqual(foo.untrackedDecrease(), 1);
    assert.strictEqual(foo.untrackedDecrease(), 0);

    const serialized = await collectAndSerialize(metricReader);

    assert.match(
      serialized,
      /function_calls_total\{\S*function="Foo.prototype.increase"\S*module="\/[^"]*\/tests\/decorators.test.js"\S*\} 2/gm,
    );

    assert.doesNotMatch(serialized, /untracked/m);
    assert.doesNotMatch(serialized, /function="Foo.prototype."/m);
  });

  await stepWithMetricReader(t, "individual method", async (metricReader) => {
    // @Autometrics decorator is likely to be used along-side other decorators
    // this tests for any conflicts
    function other(
      _target: Object,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;
      descriptor.value = originalMethod;
    }

    class Bar {
      counter = 0;

      // For individually decorated methods, the class name needs to be
      // specified explicitly if you want to include it in the metric name.
      @AutometricsLegacy({ className: "Bar" })
      @other
      increase() {
        this.counter += 1;
        return this.counter;
      }

      untrackedDecrease() {
        this.counter -= 1;
        return this.counter;
      }
    }

    const bar = new Bar();
    assert.strictEqual(bar.increase(), 1);
    assert.strictEqual(bar.increase(), 2);

    assert.strictEqual(bar.untrackedDecrease(), 1);
    assert.strictEqual(bar.untrackedDecrease(), 0);

    const serialized = await collectAndSerialize(metricReader);

    assert.match(
      serialized,
      /function_calls_total\{\S*function="Bar.prototype.increase"\S*module="\/[^"]*\/tests\/decorators.test.js"\S*\} 2/gm,
    );

    assert.doesNotMatch(serialized, /untracked/m);
    assert.doesNotMatch(serialized, /function="Bar.prototype."/m);
  });

  await stepWithMetricReader(t, "static methods", async (metricReader) => {
    @AutometricsLegacy() class Baz {
      static theAnswer() {
        return 42;
      }

      @AutometricsLegacy({ skip: true })
      static untrackedStatic() {
        return 65;
      }
    }

    assert.strictEqual(Baz.theAnswer(), 42);
    assert.strictEqual(Baz.theAnswer(), 42);

    assert.strictEqual(Baz.untrackedStatic(), 65);
    assert.strictEqual(Baz.untrackedStatic(), 65);

    const serialized = await collectAndSerialize(metricReader);

    assert.match(
      serialized,
      /function_calls_total\{\S*function="Baz.theAnswer"\S*module="\/[^"]*\/tests\/decorators.test.js"\S*\} 2/gm,
    );

    assert.doesNotMatch(serialized, /untracked/m);
    assert.doesNotMatch(serialized, /function="Baz.prototype."/m);
  });
});
