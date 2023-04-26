import { describe, expect, test } from "vitest";
import { addAutometricsOptions } from "./lib";

describe("Parcel transformer", () => {
  test("Injects options", () => {
    const filePath = "path/to/module.ts";

    const source = `
autometrics(function myFunction() {});
    `.trim();

    const transformed = `
autometrics({
  functionName: "myFunction",
  moduleName: "module.ts"
}, function myFunction() {});
  `.trim();

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds moduleName without updating functionName", () => {
    const filePath = "path/to/module2.ts";

    const source = `
autometrics({ functionName: "renamedFunction" }, function myFunction() {});
  `.trim();

    const transformed = `
autometrics({
  functionName: "renamedFunction",
  moduleName: "module2.ts"
}, function myFunction() {});
  `.trim();

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds functionName without updating moduleName", () => {
    const filePath = "path/to/module3.ts";

    const source = `
autometrics({ moduleName: "renamedModule.ts" }, function myFunction() {});
  `.trim();

    const transformed = `
autometrics({
  moduleName: "renamedModule.ts",
  functionName: "myFunction"
}, function myFunction() {});
  `.trim();

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });
});
