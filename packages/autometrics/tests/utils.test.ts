import { assertEquals } from "$std/assert/mod.ts";

import { getModulePath } from "../src/utils.ts";

// the existing getModulePath function is a hack that parses the stack trace
// as string and extracts the module path from it. This test is to ensure that
// the function works as expected
Deno.test("Utils tests", async (t) => {
  await t.step(
    "getModulePath() returns the correct module path for the original caller",
    () => {
      let modulePath: string | undefined;

      // getModulePath is always called from within the autometrics wrapper
      // function so we're recreating that here
      const wrapper = () => {
        modulePath = getModulePath();
      };

      wrapper();

      assertEquals(modulePath, "/packages/autometrics/tests/utils.test.ts");
    },
  );
});
