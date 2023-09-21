import { describe, expect, test } from "vitest";

import { getModulePath } from "../src/utils";

// the existing getModulePath function is a hack that parses the stack trace
// as string and extracts the module path from it. This test is to ensure that
// the function works as expected
describe("getModulePath test", () => {
  test("gets the correct module path for the original caller", () => {
    let modulePath: string | undefined;

    // getModulePath is always called from within the autometrics wrapper
    // function so we're recreating that here
    const dummyFunction = () => {
       modulePath = getModulePath();
    };

    dummyFunction();

    expect(modulePath).toBeDefined();
    expect(modulePath).toBe("/packages/autometrics/tests/utils.test.ts");
  });
});
