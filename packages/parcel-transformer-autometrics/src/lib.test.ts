import { describe, expect, test } from "vitest";
import { addAutometricsOptions } from "./lib";

describe("Parcel transformer", () => {
  test("Injects options", () => {
    const filePath = "path/to/module.ts";

    const source = "autometrics(function myFunction() { });";

    const transformed = `autometrics({ functionName: "myFunction", moduleName: "module.ts" }, function myFunction() { });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds moduleName without updating functionName", () => {
    const filePath = "path/to/module2.ts";

    const source = `autometrics({ functionName: "renamedFunction" }, function myFunction() { });`;

    const transformed = `autometrics({ functionName: "renamedFunction", moduleName: "module2.ts" }, function myFunction() { });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds functionName without updating moduleName", () => {
    const filePath = "path/to/module3.ts";

    const source = `autometrics({ moduleName: "renamedModule.ts" }, function myFunction() { });`;

    const transformed = `autometrics({ moduleName: "renamedModule.ts", functionName: "myFunction" }, function myFunction() { });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds autometrics options to a wrapped function in a variable assignment", () => {
    const filePath = "path/to/module4.ts";

    const source = "const myFunction = autometrics(function myFunction() { });";

    const transformed = `const myFunction = autometrics({ moduleName: "module4.ts", functionName: "myFunction" }, function myFunction() { });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });
});
