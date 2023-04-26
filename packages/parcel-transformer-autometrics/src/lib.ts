import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { ObjectExpression } from "@babel/types";
import path from "path";

export function addAutometricsOptions(code: string, filePath: string): string {
  const ast = parse(code, { sourceType: "module", plugins: ["typescript"] });

  traverse(ast, {
    CallExpression(nodePath) {
      if (
        nodePath.node.callee.type === "Identifier" &&
        nodePath.node.callee.name === "autometrics"
      ) {
        const parsedFilePath = path.parse(filePath);
        const moduleName = `${parsedFilePath.name}${parsedFilePath.ext}`;

        const [functionOrOptions, maybeFunction] = nodePath.node.arguments;

        // If the autometrics() function call's first argument is a function, we use unshift to inject the options object as the first argument
        if (functionOrOptions.type === "FunctionExpression") {
          const functionName = functionOrOptions.id.name;

          const options: ObjectExpression = {
            type: "ObjectExpression",
            properties: [],
          };

          appendOptionsProperties(options, functionName, moduleName);

          nodePath.node.arguments.unshift(options);

          // If the autometrics() function call's first argument is an options object, we append properties to the object
        } else if (
          functionOrOptions.type === "ObjectExpression" &&
          maybeFunction.type === "FunctionExpression"
        ) {
          const functionName = maybeFunction.id.name;

          appendOptionsProperties(functionOrOptions, functionName, moduleName);
          nodePath.node.arguments = [functionOrOptions, maybeFunction];
        }
      }
    },
  });

  return generate(ast).code;
}

function appendOptionsProperties(
  options: ObjectExpression,
  functionName: string,
  moduleName: string
) {
  const hasFunctionNameProperty = options.properties.some(
    (n) =>
      n.type === "ObjectProperty" &&
      n.key.type === "Identifier" &&
      n.key.name === "functionName"
  );

  if (!hasFunctionNameProperty) {
    options.properties.push({
      type: "ObjectProperty",
      key: { type: "Identifier", name: "functionName" },
      value: { type: "StringLiteral", value: functionName },
      computed: false,
      shorthand: false,
    });
  }

  const hasModuleNameProperty = options.properties.some(
    (n) =>
      n.type === "ObjectProperty" &&
      n.key.type === "Identifier" &&
      n.key.name === "moduleName"
  );

  if (!hasModuleNameProperty) {
    options.properties.push({
      type: "ObjectProperty",
      key: { type: "Identifier", name: "moduleName" },
      value: { type: "StringLiteral", value: moduleName },
      computed: false,
      shorthand: false,
    });
  }
}
