import { Node, SyntaxKind, TypeChecker } from "typescript/lib/tsserverlibrary";

function init(modules: {
	typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
	const ts = modules.typescript;

	function create({
		config,
		languageService,
		project,
	}: ts.server.PluginCreateInfo) {
		// Diagnostic logging
		project.projectService.logger.info(
			"I'm getting set up now! Check the log for this message."
		);

		// Set up decorator object
		const proxy: ts.LanguageService = Object.create(null);
		for (let k of Object.keys(languageService) as Array<
			keyof ts.LanguageService
		>) {
			const x = languageService[k]!;
			proxy[k] = (...args: Array<{}>) => x.apply(languageService, args);
		}

		const prometheusBase: string | undefined = config.url;

		proxy.getQuickInfoAtPosition = (filename, position) => {
			const typechecker = languageService.getProgram().getTypeChecker();

			const prior: ts.QuickInfo = languageService.getQuickInfoAtPosition(
				filename,
				position
			);

			let { documentation } = prior;

			const sourceFile = languageService
				.getProgram()
				.getSourceFile(filename);

			const nodeAtCursor = getNodeAtCursor(sourceFile, position);

			const nodeType: "function" | "method" | undefined = getNodeType(
				nodeAtCursor,
				typechecker
			); // Currently these are the only two we care about

			const nodeIdentifier = ((node) => {
				if (ts.isIdentifier(node)) {
					return node.escapedText as string;
				}
			})(nodeAtCursor);

			if (nodeType == undefined) {
				return prior;
			}

			const autometricsTag: boolean = isAutometricsWrappedOrDecorated(
				nodeAtCursor,
				typechecker,
				nodeType
			);
			console.log(nodeType)

			//project.projectService.logger.info(nodeIdentifier + " " + nodeType + " " + autometricsTag.valueOf().toString());

			if (autometricsTag) {
				const latency = createLatencyQuery(nodeIdentifier, nodeType);
				const requestRate = createRequestRateQuery(
					nodeIdentifier,
					nodeType
				);
				const errorRatio = createErrorRatioQuery(
					nodeIdentifier,
					nodeType
				);

				const preamble = {
					kind: "string",
					text: `\n\n
## Autometrics
View the live metrics for this function:
				`,
				};
				const queries = <ts.SymbolDisplayPart[]>[
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Request rate](${makePrometheusUrl(
							requestRate,
							prometheusBase
						)})`,
					},
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Error ratio](${makePrometheusUrl(
							errorRatio,
							prometheusBase
						)})`,
					},
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Latency (95th and 99th percentiles)](${makePrometheusUrl(
							latency,
							prometheusBase
						)})`,
					},
				];
				documentation = documentation.concat(
					preamble,
					documentation,
					queries
				);

				return <ts.QuickInfo>{
					displayParts: prior.displayParts,
					kind: prior.kind,
					kindModifiers: prior.kindModifiers,
					textSpan: prior.textSpan,
					tags: prior.tags,
					documentation,
				};
			} else {
				return prior;
			}
		};

		return proxy;
	}

	function isAutometricsWrappedOrDecorated(
		node: Node,
		typechecker: TypeChecker,
		nodeType: "function" | "method"
	): boolean {
		const declaration =
			typechecker.getSymbolAtLocation(node).valueDeclaration;

		// HACK:yeah soz this isn't the best but we're basically digging through to check
		// if the called function was wrapped by autometricsWrapper
		if (nodeType == "function") {
			if (ts.isVariableDeclaration(declaration)) {
				if (ts.isCallExpression(declaration.initializer)) {
					if (ts.isIdentifier(declaration.initializer.expression)) {
						if (
							declaration.initializer.expression.escapedText ==
							"autometricsWrapper"
						) {
							return true;
						}
					}
				}
			}
		} else if (nodeType == "method") {
			if (ts.canHaveDecorators(node.parent)) {
				const decorators = ts.getDecorators(node.parent);
				const autometricsTag = decorators.find(
					(dec) => dec.getText() == "@autometrics"
				);

				return autometricsTag ? true : false;
			}
		} else {
			throw new Error("Unhandled node type");
		}
	}

	function getNodeType(
		node: Node,
		typechecker: TypeChecker
	): "function" | "method" | undefined {
		const declaration =
			typechecker.getSymbolAtLocation(node).valueDeclaration;

		if (declaration.kind == SyntaxKind.VariableDeclaration) {
			return "function";
		} else if (declaration.kind == SyntaxKind.MethodDeclaration) {
			return "method";
		} else {
			return undefined;
		}
	}

	function getNodeAtCursor(
		sourceFile: ts.SourceFile,
		position: number
	): ts.Node | undefined {
		function find(node: ts.Node): ts.Node | undefined {
			if (position >= node.getStart() && position < node.getEnd()) {
				return ts.forEachChild(node, find) || node;
			}
		}
		return find(sourceFile);
	}

	function createLatencyQuery(nodeIdentifier: string, nodeType: string) {
		const latency = `sum by (le, function, module) (rate(${nodeType}_calls_duration_bucket{${nodeType}="${nodeIdentifier}"}[5m]))`;
		return `histogram_quantile(0.99, ${latency}) or histogram_quantile(0.95, ${latency})`;
	}

	function createRequestRateQuery(nodeIdentifier: string, nodeType: string) {
		return `sum by (function, module) (rate(${nodeType}_calls_count{${nodeType}="${nodeIdentifier}"}[5m]))`;
	}

	function createErrorRatioQuery(nodeIdentifier: string, nodeType: string) {
		const requestQuery = createRequestRateQuery(nodeIdentifier, nodeType);
		return `sum by (function, module) (rate(${nodeType}_calls_count{{${nodeType}="${nodeIdentifier}",result="error"}}[5m])) / ${requestQuery}`;
	}

	function makePrometheusUrl(query: string, base?: string) {
		if (base == undefined) {
			base = "http://localhost:9090/";
		}
		return (
			base + "graph?g0.expr=" + encodeURIComponent(query) + "&g0.tab=0"
		);
	}

	return { create };
}

export = init;
