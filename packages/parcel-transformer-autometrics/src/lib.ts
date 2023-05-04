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
          const autometricsOptions = factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
              "functionName",
              factory.createStringLiteral(
                functionOrOptions.name.escapedText.toString(),
              ),
            ),
            factory.createPropertyAssignment(
              "moduleName",
              factory.createStringLiteral(moduleName),
            ),
          ]);

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
          const autometricsProperties: PropertyAssignment[] = [];

          if (
            !functionOrOptions.properties.some(
              (objectLiteralElementLike: PropertyAssignment) => {
                return (
                  // TODO: Fix typing issue
                  // @ts-expect-error
                  objectLiteralElementLike.name.escapedText === "functionName"
                );
              },
            )
          ) {
            autometricsProperties.push(
              factory.createPropertyAssignment(
                "functionName",
                factory.createStringLiteral(
                  maybeFunction.name.escapedText.toString(),
                ),
              ),
            );
          }

          if (
            !functionOrOptions.properties.some(
              (objectLiteralElementLike: PropertyAssignment) => {
                return (
                  // TODO: Fix typing issue
                  // @ts-expect-error
                  objectLiteralElementLike.name.escapedText === "moduleName"
                );
              },
            )
          ) {
            autometricsProperties.push(
              factory.createPropertyAssignment(
                "moduleName",
                factory.createStringLiteral(moduleName),
              ),
            );
          }

          return factory.createExpressionStatement(
            factory.createCallExpression(
              node.expression.expression,
              node.expression.typeArguments,
              factory.createNodeArray([
                factory.createObjectLiteralExpression([
                  ...functionOrOptions.properties,
                  ...autometricsProperties,
                ]),
                maybeFunction,
              ]),
            ),
          );
        }
      }

      return node;
    }

    return visitNode(rootNode, visit);
  };
};

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
