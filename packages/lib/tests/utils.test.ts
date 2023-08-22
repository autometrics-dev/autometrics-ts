import { assertEquals } from "./deps.ts";
import { getModulePath } from "../src/utils.ts";

// the existing getModulePath function is a hack that parses the stack trace
// as string and extracts the module path from it. This test is to ensure that
// the function works as expected
Deno.test("getModulePath test", async (t) => {
  await t.step("gets the correct module path for the original caller", () => {
    const modulePath = getModulePath();
    // the original caller in this case is the Deno test runner, so an internal
    // Deno module path is returned, although normally it would be the file
    // route from which the function call came
    assertEquals(modulePath, "ext:cli/40_testing.js");
  });
});
