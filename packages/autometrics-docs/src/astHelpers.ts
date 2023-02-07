import ts from "typescript";

/**
 * Checks if the node is wrapped or decorated by Autometrics (but not the wrapper or decorator itself!)
 * @param node The node itself
 * @param typechecker The helper utility typechecker
 */

export function isAutometricsWrappedOrDecorated(
	node: ts.Node,
	typechecker: ts.TypeChecker,
) {
	// Checks if the user is hovering over the autometrics wrapper itself
	// in which case we should not show the queries
	const checkIfWrapperItself = (node: ts.Node) => {
		return (
			typechecker.getTypeAtLocation(node)?.symbol?.getEscapedName() ===
			"autometrics"
		);
	};

	if (checkIfWrapperItself(node)) {
		return false;
	}

	// Checks if the function the user is hovering over has a type AutometricsWrapper
	// or is wrapped by a function that has a type AutometricsWrapper
	const checkWrapperType = (node: ts.Node) => {
		return typechecker
			.getTypeAtLocation(node)
			?.symbol?.getEscapedName() as string;
	};

	const type = checkWrapperType(node);
	const parentType = checkWrapperType(node.parent);

	if (type === "AutometricsWrapper" || parentType === "AutometricsWrapper") {
		return true;
	}

	// If none of the function checkers return, we continue investigating if it
	// has the right decorators for class methods
	if (ts.canHaveDecorators(node.parent) && ts.getDecorators(node.parent)) {
		const decorators = ts.getDecorators(node.parent);
		const autometricsDecorator = decorators.find((dec) => {
			// TODO: make this more flexible for when decorators will have parameters
			if (dec.getText() === "@autometrics") {
				return true;
			}
		});

		return autometricsDecorator ? true : false;
	}

	// Otherwise just return false
	return false;
}

/**
 * Gets the node identifier
 * @param node {ts.Node} - the node itself
 * @param nodeType {"function" | "method"} - so we know what kind of check to run
 * @param typechecker {ts.TypeChecker} - helper util
 */
export function getNodeIdentifier(
	node: ts.Node,
	nodeType: "function" | "method",
	typechecker: ts.TypeChecker,
): string {
	if (nodeType === "method") {
		if (ts.isIdentifier(node)) {
			return node.escapedText as string;
		}
	} else if (nodeType === "function") {
		const declaration = typechecker.getSymbolAtLocation(node).valueDeclaration;

		const type = typechecker
			.getTypeAtLocation(node)
			.symbol.getEscapedName() as string;

		// const funcWithMetrics = autometrics(originalFunc)
		//
		// If we find that we're hovering over a wrapped function,
		// we trace the AST to find the identifier of the original function
		// that was wrapped
		//
		// The first element in the wrapper function will always be the original function
		if (
			type === "AutometricsWrapper" &&
			ts.isVariableDeclaration(declaration) &&
			ts.isCallExpression(declaration.initializer) &&
			ts.isIdentifier(declaration.initializer.arguments[0]) &&
			declaration.initializer.arguments[0]
		) {
			return declaration.initializer.arguments[0].escapedText as string;
		} else {
			// other wise just return the identifier user is currently hovering over
			if (ts.isIdentifier(node)) {
				return node.escapedText as string;
			}
		}
	}
}

/**
 * Gets the type of the node (we care only about functions or methods)
 * @param node The node itself
 * @param typechecker The helper utility
 */
export function getNodeType(node: ts.Node, typechecker: ts.TypeChecker) {
	if (!node.parent) {
		return undefined;
	}

	const declaration = typechecker.getSymbolAtLocation(node);

	if (!declaration.valueDeclaration) {
		return undefined;
	}

	// Check if the original node declaration is a method declaration
	if (ts.isMethodDeclaration(declaration.valueDeclaration)) {
		return "method";
	} else if (
		// If the original node declaration is a function declaration or expression
		ts.isFunctionLike(declaration.valueDeclaration)
	) {
		return "function";
	} else if (
		// If the original node declaration is an declared with autometrics
		// const originalFunc = () => {}
		ts.isVariableDeclaration(declaration.valueDeclaration) &&
		ts.isFunctionLike(declaration.valueDeclaration.initializer)
	) {
		return "function";
	} else if (
		// If the original node declaration is a wrapper function declared with autometrics
		// const funcWithMetrics = autometrics(originalFunc)
		ts.isVariableDeclaration(declaration.valueDeclaration) &&
		ts.isCallExpression(declaration.valueDeclaration.initializer)
	) {
		return "function";
	} else {
		return undefined;
	}
}

/**
 * Gets the node you're currently hovering over
 * @param sourceFile Source file node of the current file
 * @param position Current cursor/mouse position
 */
export function getNodeAtCursor(
	sourceFile: ts.SourceFile,
	position: number,
): ts.Node | undefined {
	function find(node: ts.Node): ts.Node | undefined {
		if (position >= node.getStart() && position < node.getEnd()) {
			return ts.forEachChild(node, find) || node;
		}
	}
	return find(sourceFile);
}
