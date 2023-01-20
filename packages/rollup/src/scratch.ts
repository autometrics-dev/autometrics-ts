import ts from "typescript";

export function determine_function_identifier(
	function_node: ts.Node
): string {
	if (function_node.kind == ts.SyntaxKind.FunctionDeclaration) {
		const function_id = function_node
			.getChildren()
			.find((child) => {
				if (child.kind == ts.SyntaxKind.Identifier) {
					return true;
				}
			})
			?.getText();

		if (function_id == undefined) {
			throw new Error("Cannot determine function identifier")
		}

		console.log(`Function Identifier: ${function_id}`);

		return function_id;
	} else if (function_node.kind == ts.SyntaxKind.FunctionExpression) {
		const function_id = function_node
			.getChildren()
			.find((child) => {
				if (child.kind == ts.SyntaxKind.Identifier) {
					return true;
				}
			})
			?.getText();

		if (function_id == undefined) {
			throw new Error("Cannot determine function identifier")
		}

		console.log(`Function Identifier: ${function_id}`);

		return function_id;
	} else if (function_node.kind == ts.SyntaxKind.MethodDeclaration) {
		const function_id = function_node
			.getChildren()
			.find((child) => {
				if (child.kind == ts.SyntaxKind.Identifier) {
					return true;
				}
			})
			?.getText();

		if (function_id == undefined) {
			throw new Error("Cannot determine function identifier")
		}

		console.log(`Function Identifier: ${function_id}`);

		return function_id;
	} else if (function_node.kind == ts.SyntaxKind.ArrowFunction) {
		const function_id = function_node.parent
			.getChildren()
			.find((child) => {
				if (child.kind == ts.SyntaxKind.Identifier) {
					return true;
				}
			})
			?.getText();

		if (function_id == undefined) {
			throw new Error("Cannot determine function identifier")
		}

		console.log(`Function Identifier: ${function_id}`);
		return function_id;
	} else {
		throw new Error("Cannot determine function identifier")
	}
}


export function traverse_up_until_root(node: ts.Node): ts.Node {
	if (node.parent.kind == ts.SyntaxKind.SourceFile) {
		console.log(ts.SyntaxKind[node.kind]);
		return node;
	} else {
		console.log("traversing up");
		return traverse_up_until_root(node.parent);
	}
}

export function find_first_function(node: ts.Node): ts.Node | undefined {
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node)
	) {
		return node;
	}

	return node.forEachChild((child) => find_first_function(child));
}

function instrumentFunctionsWithTag(source: ts.SourceFile): ts.SourceFile {

	source.forEachChild((node) => {
		const docs = ts.getAllJSDocTagsOfKind(node, ts.SyntaxKind.JSDocTag);
		const tagged_nodes: ts.Node[] = docs.map((doc) => {
			return traverse_up_until_root(doc.parent);
		});

		tagged_nodes.map((node) => {
			let function_node = find_first_function(node) ?? node;
		});
	});

}

function addMetricsInstrumentation(src: ts.SourceFile): ts.SourceFile {

	const imports = [
		{
			func: "PrometheusExporter",
			from: "@opentelemetry/exporter-prometheus"
		},
		{
			func: "MeterProvider",
			from: "@opentelemetry/sdk-metrics"
		}
	]

	/** 
	*
	* Creates the import { PrometheusExporter } "@opentelemetry/exporter-prometheus" 
	* lines
	*
	 */
	const importStatements = imports.map((imp) => {
		return ts.factory.createImportDeclaration(
			undefined,
			ts.factory.createImportClause(
				false,
				undefined,
				ts.factory.createNamedImports([
					ts.factory.createImportSpecifier(
						false,
						undefined,
						ts.factory.createIdentifier(imp.func)
					)
				]),
			),
			ts.factory.createStringLiteral(imp.from, false)
		)

	})

}


const transformer = <T extends ts.Node>(ctx: ts.TransformationContext) => (root: T) => {

	function visit(node: ts.Node): ts.Node {
		node = ts.visitEachChild(node, visit, ctx);

		if (
			ts.isFunctionDeclaration(node)
		) {
			const autometricsTag = ts.getJSDocTags(node).find(tag => { if (tag.getText().trimEnd() == "@autometrics") { return true } })?.getText().trimEnd();
			console.log(autometricsTag);
			if (autometricsTag != undefined) {
				let function_node = <ts.FunctionDeclaration>node;
				function_node = addAutometrics(function_node);
				return function_node

			}
		}

		return node
	}
	return ts.visitNode(root, visit)
}


function addAutometrics(function_node: ts.FunctionDeclaration): ts.FunctionDeclaration {

	if (function_node.body == undefined) {
		throw new Error("No function body")
	}

	// TODO: the code below assumes that 
	// 1. Function has a return statement
	// 2. Function has only 1 return statement

	const returnStatement = function_node.body.statements.find((st) => isReturnStatement(st)) ?? ts.factory.createDebuggerStatement();
	const returnStatementIdx = function_node.body.statements.findIndex((st) => isReturnStatement(st))
	const restOfBody = function_node.body.statements.slice(0, returnStatementIdx);

	const nodeArr = [autometricsInitNode.statements, restOfBody, autometricsReturnNode.statements, returnStatement].flat();

	const newBlock = ts.factory.createBlock(
		ts.factory.createNodeArray(
			nodeArr, false),
		true)

	return ts.factory.updateFunctionDeclaration(
		function_node,
		function_node.modifiers,
		function_node.asteriskToken,
		function_node.name,
		function_node.typeParameters,
		function_node.parameters,
		function_node.type,
		newBlock
	)
}
