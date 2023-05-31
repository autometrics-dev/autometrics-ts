import { describe, expect, test } from "vitest";
import { addAutometricsOptions } from "./lib";

describe("Parcel transformer", () => {
  test("Injects options", () => {
    const filePath = "path/to/module.ts";

    const source = "autometrics(function myFunction() { return true; });";

    const transformed = `autometrics({ functionName: "myFunction", moduleName: "module.ts" }, function myFunction() { return true; });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds moduleName without updating functionName", () => {
    const filePath = "path/to/module2.ts";

    const source = `autometrics({ functionName: "renamedFunction" }, function myFunction() { return true; });`;

    const transformed = `autometrics({ functionName: "renamedFunction", moduleName: "module2.ts" }, function myFunction() { return true; });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds functionName without updating moduleName", () => {
    const filePath = "path/to/module3.ts";

    const source = `autometrics({ moduleName: "renamedModule.ts" }, function myFunction() { return true; });`;

    const transformed = `autometrics({ moduleName: "renamedModule.ts", functionName: "myFunction" }, function myFunction() { return true; });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds options to a variable assignment", () => {
    const filePath = "path/to/module4.ts";

    const source =
      "const renamedFunction = autometrics(function myFunction() { return true; });";

    const transformed = `const renamedFunction = autometrics({ functionName: "myFunction", moduleName: "module4.ts" }, function myFunction() { return true; });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds moduleName to the options in a variable assignment", () => {
    const filePath = "path/to/module5.ts";

    const source = `const myFunction = autometrics({ functionName: "renamedFunction" }, function myFunction() { return true; });`;

    const transformed = `const myFunction = autometrics({ functionName: "renamedFunction", moduleName: "module5.ts" }, function myFunction() { return true; });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });

  test("Adds functionName to the options in a variable assignment", () => {
    const filePath = "path/to/module5.ts";

    const source = `const myFunction = autometrics({ moduleName: "renamedModule.ts" }, function myFunction() { return true; });`;

    const transformed = `const myFunction = autometrics({ moduleName: "renamedModule.ts", functionName: "myFunction" }, function myFunction() { return true; });`;

    expect(addAutometricsOptions(source, filePath)).toEqual(transformed);
  });
});
