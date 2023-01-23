import { Plugin } from "rollup";
import ts from "typescript";
import {
	createAutometricsHeader,
	createAutometricsInit,
	createAutometricsReturn,
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
					const result = ts.transform<ts.SourceFile>(
						parse(filename, src),
						[transformer]
					);

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
			},
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
			<ts.Statement[]>createAutometricsHeader(8081), // FIXME: prometheus port is hardcoded here
			functionsInstrumentedSrc.statements,
		].flat();

		return ts.factory.updateSourceFile(functionsInstrumentedSrc, finalSrc);
	};
};

const functionTransformer = <T extends ts.Node>(ctx: ts.TransformationContext) =>
		(root: T) => {
			function visit(node: ts.Node): ts.Node {
				node = ts.visitEachChild(node, visit, ctx);

				if (ts.isFunctionLike(node)) {
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
						return addAutometrics(<ts.FunctionDeclaration>node, ctx);
					}
				}

				return node;
			}
			return ts.visitNode(root, visit);
		};

function addAutometrics(
	functionNode: ts.FunctionDeclaration,
	ctx: ts.TransformationContext
): ts.FunctionDeclaration {
	const functionIdentifier = functionNode.name?.escapedText as string;

	if (functionIdentifier == undefined) {
		throw new Error("Autometrics needs a named function to instrument");
	}

	if (functionNode.body == undefined) {
		throw new Error("Autometrics needs a function body to instrument");
	}

	functionNode = <ts.FunctionDeclaration>(
		handleInitStatements(functionNode, ctx)
	);
	functionNode = <ts.FunctionDeclaration>(
		handleReturnStatements(functionNode, ctx, functionIdentifier)
	);

	return functionNode
}

function handleInitStatements(
	node: ts.Node,
	ctx: ts.TransformationContext
): ts.Node {
	console.log("got to the init statement")
	const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		if (ts.isBlock(node)) {

			const autometricsInit = ts.factory.createNodeArray(<ts.Statement[]>createAutometricsInit());

			return ts.factory.updateBlock(node,
				ts.factory.createNodeArray(
					[autometricsInit, node.statements].flat(),
					false
				)
			);
		}
		return ts.visitEachChild(node, visitor, ctx);
	};

	return ts.visitNode(node, visitor);
}

function handleReturnStatements(
	node: ts.Node,
	ctx: ts.TransformationContext,
	functionIdentifier: string
): ts.Node {
	console.log("got here too")
	const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		if (ts.isReturnStatement(node)) {
			const autometricsReturn =
				createAutometricsReturn(functionIdentifier);
			autometricsReturn.push(node);

			return autometricsReturn;
		}

		return ts.visitEachChild(node, visitor, ctx);
	};

	return ts.visitNode(node, visitor);
}

