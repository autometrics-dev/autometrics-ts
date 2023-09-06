import { describe, expect, test } from "vitest";

import { getModulePath } from "../src/utils";

// the existing getModulePath function is a hack that parses the stack trace
// as string and extracts the module path from it. This test is to ensure that
// the function works as expected
describe("getModulePath test", () => {
  test("gets the correct module path for the original caller", () => {
    const modulePath = getModulePath();
    expect(modulePath).toBeDefined();
    // the original caller in this case is the vitest test runner although normally
    // it would be the file route from which the function call came
    expect(modulePath).toBe("/node_modules/@vitest/runner/dist/index.js");
  });
});
