import { assertThrows } from "$std/assert/mod.ts";
import { readClosest } from "../src/platform.node.ts";

Deno.test("Node.js platform tests", async (t) => {
  // NOTE: Added this test as a quick way to cover the fix from #149 - fix an infinite loop which happens when autometrics is initialized in a node service without a git repository
  await t.step(
    "readClosest does not loop infinitely on nonexistent file",
    () => {
      assertThrows(
        () => readClosest("nonexistent.file"),
        Error,
        "Could not read nonexistent.file",
      );
    },
  );
});
