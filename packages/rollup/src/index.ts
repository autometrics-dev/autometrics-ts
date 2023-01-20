import { Plugin } from "rollup";
import ts from "typescript";
import {
	autometricsHeader,
	autometricsInit,
	autometricsReturn,
} from "./instrumentation";

function parse(fileName: string, code: string): ts.SourceFile {
	return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
}

export default function autometrics(): Plugin {
	return {
		name: "autometrics",
		transform: {
			order: "pre",
			handler(src: string, filename: string) {

				let newSrc = src;
				if (filename.endsWith(".ts")) {

					const result = ts.transform<ts.SourceFile>(parse(filename, src), [
						transformer,
					]);

					const newAst: ts.SourceFile = result.transformed[0];
					const printer: ts.Printer = ts.createPrinter();

					newSrc = printer.printFile(newAst);

					console.log(
						"Original file:\n" +
						src +
						"\n\nTransformed file:\n" +
						newSrc
					);

					result.dispose();
					return newSrc;
				}

				return {
					code: newSrc,
					map: { mappings: "" },
				};
			}
		},
	};
}

const transformer: ts.TransformerFactory<ts.SourceFile> = () => {
	return (sourceFile) => {
		const taggedFunction = sourceFile.statements.find((node: ts.Node) => {
			if (ts.isFunctionDeclaration(node)) {
				const autometricsTag = ts
					.getJSDocTags(node)
					.find((tag) => {
						if (tag.getText().trimEnd() == "@autometrics") {
							return true;
						}
					})
					?.getText()
					.trimEnd();
				if (autometricsTag != undefined) {
					return true;
				}
			}
		});

		if (taggedFunction == undefined) {
			return sourceFile;
		}

		const functionsInstrumentedSrc = <ts.SourceFile>(
			ts.transform(sourceFile, [functionTransformer]).transformed[0]
		);
		const finalSrc = [
			autometricsHeader().statements,
			functionsInstrumentedSrc.statements,
		].flat();

		return ts.factory.updateSourceFile(functionsInstrumentedSrc, finalSrc);
	};
};

const functionTransformer = <T extends ts.Node>(ctx: ts.TransformationContext) =>
	(root: T) => {
		function visit(node: ts.Node): ts.Node {
			node = ts.visitEachChild(node, visit, ctx);

			if (ts.isFunctionDeclaration(node)) {
				const autometricsTag = ts
					.getJSDocTags(node)
					.find((tag) => {
						if (tag.getText().trimEnd() == "@autometrics") {
							return true;
						}
					})
					?.getText()
					.trimEnd();
				if (autometricsTag != undefined) {
					return addAutometrics(<ts.FunctionDeclaration>node);
				}
			}

			return node;
		}
		return ts.visitNode(root, visit);
	};

function addAutometrics(
	function_node: ts.FunctionDeclaration
): ts.FunctionDeclaration {
	if (function_node.body == undefined) {
		throw new Error("No function body");
	}

	// TODO: the code below assumes that
	// 1. Function has a return statement
	// 2. Function has only 1 return statement

	const returnStatement =
		function_node.body.statements.find((st) => isReturnStatement(st));
	const returnStatementIdx = function_node.body.statements.findIndex((st) =>
		isReturnStatement(st)
	);
	const restOfBody = function_node.body.statements.slice(
		0,
		returnStatementIdx
	);

	const nodeArr = [
		autometricsInit().statements,
		restOfBody,
		autometricsReturn(function_node.name?.getText() ?? "unnamed")
			.statements,
		returnStatement,
	].flat();

	const newBlock = ts.factory.createBlock(
		ts.factory.createNodeArray(nodeArr, false),
		true
	);

	return ts.factory.updateFunctionDeclaration(
		function_node,
		function_node.modifiers,
		function_node.asteriskToken,
		function_node.name,
		function_node.typeParameters,
		function_node.parameters,
		function_node.type,
		newBlock
	);
}

function isReturnStatement(statement: ts.Statement): boolean {
	if (statement.kind == ts.SyntaxKind.ReturnStatement) {
		return true;
	} else {
		return false;
	}
}
