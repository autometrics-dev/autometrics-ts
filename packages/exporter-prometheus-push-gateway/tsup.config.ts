import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  sourcemap: true,
  dts: true,
  format: ["cjs", "esm"],
  entry: ["src/index.ts"],
});
