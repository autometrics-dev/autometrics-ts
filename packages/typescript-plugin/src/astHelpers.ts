import type {
  Node,
  SourceFile,
  TypeChecker,
} from "typescript/lib/tsserverlibrary";
import { Tsserver } from "./types";
import type { NodeType } from "./types";

/**
 * Checks if the node is wrapped or decorated by Autometrics (but not the
 * wrapper or decorator itself!)
 * @param node The node itself
 * @param typechecker The helper utility typechecker
 */
export function isAutometricsWrappedOrDecorated(
  node: Node,
  typechecker: TypeChecker,
  ts: Tsserver,
) {
  // Checks if the user is hovering over the autometrics wrapper itself in which
  // case we should not show the queries
  const isAutometricsWrapper =
    typechecker.getTypeAtLocation(node)?.aliasSymbol?.getEscapedName() ===
    "autometrics";

  if (isAutometricsWrapper) {
    return false;
  }

  // Checks if the function the user is hovering over has a type
  // AutometricsWrapper or is wrapped by a function that has a type
  // AutometricsWrapper
  const checkWrapperType = (node: Node) => {
    if (ts.isSourceFile(node)) {
      return;
    }

    return typechecker.getTypeAtLocation(node)?.aliasSymbol?.getEscapedName();
  };

  const type = checkWrapperType(node);
  const parentType = checkWrapperType(node.parent);

  if (type === "AutometricsWrapper" || parentType === "AutometricsWrapper") {
    return true;
  }

  // If none of the function checkers return, we continue investigating if a
  // decorator is applied to either a class method or its parent class
  const method = typechecker
    .getSymbolAtLocation(node)
    ?.declarations?.find((declaration) => ts.isMethodDeclaration(declaration));
  if (!method) {
    return false;
  }

  const isDecorated =
    hasAutometricsDecorator(method, ts) ||
    hasAutometricsDecorator(method.parent, ts);
  return isDecorated;
}

export function hasAutometricsDecorator(node: Node, ts: Tsserver) {
  const decorators = ts.canHaveDecorators(node) && ts.getDecorators(node);
  if (!decorators) {
    return false;
  }

  const hasAutometricsDecorator = decorators.some((decorator) =>
    decorator.getText().startsWith("@Autometrics"),
  );

  return hasAutometricsDecorator;
}

/**
 * Gets the node identifier
 * @param node {Node} - the node itself
 * @param nodeType {NodeType} - so we know what kind of check to run
 * @param typechecker {ts.TypeChecker} - helper util
 */
export function getNodeIdentifier(
  node: Node,
  nodeType: NodeType,
  typechecker: TypeChecker,
  ts: Tsserver,
): string | undefined {
  if (nodeType === "function") {
    const declaration = typechecker.getSymbolAtLocation(node)?.valueDeclaration;

    const type = typechecker
      .getTypeAtLocation(node)
      .symbol.getEscapedName()
      .toString();

    // const functionWithMetrics = autometrics(originalFunc);
    //
    // If we find that we're hovering over a wrapped function, we trace the AST
    // to find the identifier of the original function that was wrapped
    //
    // The first element in the wrapper function will always be the original
    // function
    if (
      declaration &&
      type === "AutometricsWrapper" &&
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer &&
      ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.arguments[0]) &&
      declaration.initializer.arguments[0]
    ) {
      return declaration.initializer.arguments[0].escapedText.toString();
    }
  }
  // otherwise just return the identifier user is currently hovering over
  if (ts.isIdentifier(node)) {
    return node.escapedText.toString();
  }
}

/**
 * Gets the type of the node (we care only about functions or methods)
 * @param node The node itself
 * @param typechecker The helper utility
 * @returns {NodeType | undefined}
 */
export function getNodeType(
  node: Node,
  typechecker: TypeChecker,
  ts: Tsserver,
): "method" | "function" | undefined {
  const declaration = typechecker.getSymbolAtLocation(node);

  if (!declaration?.valueDeclaration) {
    return undefined;
  }

  const { valueDeclaration } = declaration;

  // Check if the original node declaration is a method declaration
  if (ts.isMethodDeclaration(valueDeclaration)) {
    return "method";
  }

  // If the original node declaration is a function declaration or expression
  if (ts.isFunctionLike(valueDeclaration)) {
    return "function";
  }

  // If the original node is declared with autometrics
  // const originalFunc = () => {}
  if (
    ts.isVariableDeclaration(valueDeclaration) &&
    ts.isFunctionLike(valueDeclaration?.initializer)
  ) {
    return "function";
  }

  // If the original node declaration is a wrapper function declared with
  // autometrics
  // const funcWithMetrics = autometrics(originalFunc);
  if (
    ts.isVariableDeclaration(declaration?.valueDeclaration) &&
    declaration?.valueDeclaration?.initializer &&
    ts.isCallExpression(declaration?.valueDeclaration?.initializer)
  ) {
    return "function";
  }

  return undefined;
}

/**
 * Gets the node that is hovered over
 * @param sourceFile Source file node of the current file
 * @param position Current cursor/mouse position
 */
export function getNodeAtCursor(
  sourceFile: SourceFile,
  position: number,
  ts: Tsserver,
): Node | undefined {
  const find = (node: Node): Node | undefined => {
    if (position >= node.getStart() && position < node.getEnd()) {
      const children = node.getChildren();
      for (const child of children) {
        const result = find(child);
        if (result) {
          return result;
        }
      }

      return node;
    }
  };

  return find(sourceFile);
}
