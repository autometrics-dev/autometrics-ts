function init(modules: {
	typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
	const ts = modules.typescript;

	function create({
		config,
		languageService: languageService,
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
			);

			// If it's not a method or function - return early
			if (nodeType == undefined) {
				return prior;
			}

			const nodeIdentifier = getNodeIdentifier(
				nodeAtCursor,
				nodeType,
				typechecker
			);
			const autometrics = isAutometricsWrappedOrDecorated(
				nodeAtCursor,
				typechecker,
				nodeType
			);

			if (autometrics) {
				const latency = create_latency_query(nodeIdentifier, nodeType);
				const request_rate = create_request_rate_query(
					nodeIdentifier,
					nodeType
				);
				const error_ratio = create_error_ratio_query(
					nodeIdentifier,
					nodeType
				);

				const preamble = {
					kind: "string",
					text: `\n\n## Autometrics\n\nView the live metrics for the \`${nodeIdentifier}\` function:\n `,
				};
				const queries = <ts.SymbolDisplayPart[]>[
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Request rate](${make_prometheus_url(
							request_rate,
							prometheusBase
						)})`,
					},
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Error ratio](${make_prometheus_url(
							error_ratio,
							prometheusBase
						)})`,
					},
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Latency (95th and 99th percentiles)](${make_prometheus_url(
							latency,
							prometheusBase
						)})`,
					},
					{
						kind: "space",
						text: "\n",
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

	/**
	 * Checks if the node is wrapped or decorated by Autometrics
	 * @param node The node itself
	 * @param typechecker The helper utility typechecker
	 * @param nodeType So we know which branch to run
	 */
	function isAutometricsWrappedOrDecorated(
		node: ts.Node,
		typechecker: ts.TypeChecker,
		nodeType: "function" | "method"
	): boolean {
		if (nodeType == "function") {
			const type = typechecker
				.getTypeAtLocation(node)
				.symbol.getEscapedName() as string;
			return type == "AutometricsWrapper" ? true : false;
		} else if (nodeType == "method") {
			if (
				ts.canHaveDecorators(node.parent) &&
				ts.getDecorators(node.parent)
			) {
				const decorators = ts.getDecorators(node.parent);
				const autometricsDecorator = decorators.find((dec) => {
					if (dec.getText() == "@Autometrics") {
						return true;
					}
				});
				return autometricsDecorator ? true : false;
			}
		} else {
			return false;
		}
	}

	/**
	 * Gets the node identifier
	 * @param node {ts.Node} - the node itself
	 * @param nodeType {"function" | "method"} - so we know what kind of check to run
	 * @param typechecker {ts.TypeChecker} - helper util
	 */
	function getNodeIdentifier(
		node: ts.Node,
		nodeType: "function" | "method",
		typechecker: ts.TypeChecker
	): string {
		if (nodeType == "method") {
			if (ts.isIdentifier(node)) {
				return node.escapedText as string;
			}
		} else {
			const declaration =
				typechecker.getSymbolAtLocation(node).valueDeclaration;
			if (ts.isVariableDeclaration(declaration)) {
				if (ts.isCallExpression(declaration.initializer)) {
					if (ts.isIdentifier(declaration.initializer.arguments[0])) {
						// The first element in the wrapper function will always be the original function
						return declaration.initializer.arguments[0]
							.escapedText as string;
					}
				}
			}
		}
	}

	/**
	 * Gets the type of the node (we care only about functions or methods)
	 * @param node The node itself
	 * @param typechecker The helper utility
	 */
	function getNodeType(
		node: ts.Node,
		typechecker: ts.TypeChecker
	): "function" | "method" | undefined {
		const kind = ts.SyntaxKind[node.parent.kind];
		if (
			!ts.isVariableDeclaration(node.parent) &&
			!ts.isMethodDeclaration(node.parent) &&
			!ts.isCallExpression(node.parent)
		) {
			return undefined;
		}
		const declaration =
			typechecker.getSymbolAtLocation(node).valueDeclaration;

		if (
			declaration.kind == ts.SyntaxKind.VariableDeclaration ||
			declaration.kind == ts.SyntaxKind.CallExpression
		) {
			return "function";
		} else if (declaration.kind == ts.SyntaxKind.MethodDeclaration) {
			return "method";
		} else {
			return undefined;
		}
	}

	/**
	 * Gets the node you're currently hovering over
	 * @param sourceFile Source file node of the current file
	 * @param position Current cursor/mouse position
	 */
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

	/* Functions below template creation of relevant queries and encode them in URL */

	function create_latency_query(nodeIdentifier: string, nodeType: string) {
		const latency = `sum by (le, function, module) (rate(${nodeType}_calls_duration_bucket{${nodeType}="${nodeIdentifier}"}[5m]))`;
		return `histogram_quantile(0.99, ${latency}) or histogram_quantile(0.95, ${latency})`;
	}

	function create_request_rate_query(
		nodeIdentifier: string,
		nodeType: string
	) {
		return `sum by (function, module) (rate(${nodeType}_calls_count{${nodeType}="${nodeIdentifier}"}[5m]))`;
	}

	function create_error_ratio_query(
		nodeIdentifier: string,
		nodeType: string
	) {
		const requestQuery = create_request_rate_query(
			nodeIdentifier,
			nodeType
		);
		return `sum by (function, module) (rate(${nodeType}_calls_count{{${nodeType}="${nodeIdentifier}",result="error"}}[5m])) / ${requestQuery}`;
	}

	function make_prometheus_url(query: string, base?: string) {
		if (base == undefined || base == "") {
			base = "http://localhost:9090/";
		}
		return (
			base + "graph?g0.expr=" + encodeURIComponent(query) + "&g0.tab=0"
		);
	}

	return { create };
}

export = init;
