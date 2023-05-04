import path from "path";
import {
  EmitHint,
  NewLineKind,
  Node,
  PropertyAssignment,
  ScriptTarget,
  TransformationContext,
  TransformerFactory,
  createPrinter,
  createSourceFile,
  isCallExpression,
  isExpressionStatement,
  isFunctionExpression,
  isIdentifier,
  isObjectLiteralExpression,
  transform,
  visitEachChild,
  visitNode,
  NodeFactory,
  ObjectLiteralExpression,
} from "typescript";

let moduleName: string;
const transformerFactory: TransformerFactory<Node> = (
  context: TransformationContext,
) => {
  const { factory } = context;
  return (rootNode) => {
    function visit(node: Node): Node {
      node = visitEachChild(node, visit, context);

      if (
        isExpressionStatement(node) &&
        isCallExpression(node.expression) &&
        isIdentifier(node.expression.expression) &&
        node.expression.expression.escapedText === "autometrics"
      ) {
        const [functionOrOptions, maybeFunction] = node.expression.arguments;
        if (isFunctionExpression(functionOrOptions)) {
          const functionName = functionOrOptions.name.escapedText.toString();

          const autometricsOptions = factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
              "functionName",
              factory.createStringLiteral(functionName),
            ),
            factory.createPropertyAssignment(
              "moduleName",
              factory.createStringLiteral(moduleName),
            ),
          ]);

          console.log(
            `Autometrics: Adding options to ${functionName} in ${moduleName}`,
          );

          return factory.createExpressionStatement(
            factory.createCallExpression(
              node.expression.expression,
              node.expression.typeArguments,
              factory.createNodeArray([
                autometricsOptions,
                ...node.expression.arguments,
              ]),
            ),
          );
        } else if (
          isObjectLiteralExpression(functionOrOptions) &&
          isFunctionExpression(maybeFunction)
        ) {
          const functionName = maybeFunction.name.escapedText.toString();

          let options = addObjectPropertyIfMissing(
            factory,
            functionOrOptions,
            "functionName",
            functionName,
          );

          options = addObjectPropertyIfMissing(
            factory,
            options,
            "moduleName",
            moduleName,
          );

          console.log(
            `Autometrics: Adding options to ${functionName} in ${moduleName}`,
          );

          return factory.createExpressionStatement(
            factory.createCallExpression(
              node.expression.expression,
              node.expression.typeArguments,
              factory.createNodeArray([options, maybeFunction]),
            ),
          );
        }
      }

      return node;
    }

    return visitNode(rootNode, visit);
  };
};

function addObjectPropertyIfMissing(
  factory: NodeFactory,
  options: ObjectLiteralExpression,
  key: string,
  value: string,
) {
  if (
    !options.properties.some(
      (node: PropertyAssignment) =>
        "escapedText" in node.name && node.name.escapedText === key,
    )
  ) {
    return factory.updateObjectLiteralExpression(options, [
      ...options.properties,
      factory.createPropertyAssignment(key, factory.createStringLiteral(value)),
    ]);
  }

  return options;
}

export function addAutometricsOptions(code: string, filePath: string): string {
  const parsedFilePath = path.parse(filePath);
  moduleName = `${parsedFilePath.name}${parsedFilePath.ext}`;

  const sourceFile = createSourceFile(filePath, code, ScriptTarget.Latest);

  const printer = createPrinter({ newLine: NewLineKind.LineFeed });

  const transformationResult = transform(sourceFile, [transformerFactory]);

  const result = printer.printNode(
    EmitHint.Unspecified,
    transformationResult.transformed[0],
    sourceFile,
  );

  return result.trim();
}
