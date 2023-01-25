import ts from "typescript";
import { createAutometricsHeader, createAutometricsInit, createAutometricsReturn } from "./instrumentation";

const printer: ts.Printer = ts.createPrinter();

export default function replaceInSrc(fileName: string, src: string): { fileText?: string, replaced: boolean } {
	const sourceFile = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, false);
	const result = ts.transform(sourceFile, [transformer])

	const updatedSourceFile = result.transformed[0];

	if (updatedSourceFile == sourceFile) {
		return { replaced: false }
	}

	const newSrc = printer.printFile(updatedSourceFile);

	result.dispose()

	return { fileText: newSrc, replaced: true }

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

