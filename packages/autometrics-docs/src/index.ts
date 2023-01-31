function init(modules: {
	typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
	const ts = modules.typescript;

	function create({
		config,
		languageService: language_service,
		project,
	}: ts.server.PluginCreateInfo) {
		// Diagnostic logging
		project.projectService.logger.info(
			"I'm getting set up now! Check the log for this message."
		);

		// Set up decorator object
		const proxy: ts.LanguageService = Object.create(null);
		for (let k of Object.keys(language_service) as Array<
			keyof ts.LanguageService
		>) {
			const x = language_service[k]!;
			proxy[k] = (...args: Array<{}>) => x.apply(language_service, args);
		}

		const prometheus_base: string | undefined = config.url;

		proxy.getQuickInfoAtPosition = (filename, position) => {
			const typechecker = language_service.getProgram().getTypeChecker();

			const prior: ts.QuickInfo = language_service.getQuickInfoAtPosition(
				filename,
				position
			);

			let { documentation } = prior;

			const source_file = language_service
				.getProgram()
				.getSourceFile(filename);

			const node_at_cursor = get_node_at_cursor(source_file, position);

			const node_type: "function" | "method" | undefined = get_node_type(
				node_at_cursor,
				typechecker
			);

			// If it's not a method or function - return early
			if (node_type == undefined) {
				return prior;
			}

			const node_identifier = get_node_identifier(node_at_cursor, node_type, typechecker);

			const autometrics_tag: boolean = is_autometrics_wrapped_or_decorated(
				node_at_cursor,
				typechecker,
				node_type
			);

			if (autometrics_tag) {
				const latency = create_latency_query(node_identifier, node_type);
				const request_rate = create_request_rate_query(node_identifier, node_type);
				const error_ratio = create_error_ratio_query(node_identifier, node_type);

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
						text: `- [Request rate](${make_prometheus_url(
							request_rate,
							prometheus_base
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
							prometheus_base
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
							prometheus_base
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

	// Checks if the hovered element is decorated or wrapped by autometrics
	function is_autometrics_wrapped_or_decorated(
		node: ts.Node,
		typechecker: ts.TypeChecker,
		nodeType: "function" | "method"
	): boolean {
		const declaration =
			typechecker.getSymbolAtLocation(node).valueDeclaration;

		if (nodeType == "function") {
			if (ts.isVariableDeclaration(declaration)) {
				if (ts.isCallExpression(declaration.initializer)) {
					if (ts.isIdentifier(declaration.initializer.expression)) {
						if (
							declaration.initializer.expression.escapedText ==
							"autometrics_wrapper"
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

	function get_node_identifier(
		node: ts.Node,
		node_type: "function" | "method",
		typechecker: ts.TypeChecker
	): string {

		if (node_type == "method") {
			if (ts.isIdentifier(node)) {
				return node.escapedText as string
			}
		} else {
			const declaration = typechecker.getSymbolAtLocation(node).valueDeclaration;
			if (ts.isVariableDeclaration(declaration)) {
				if (ts.isCallExpression(declaration.initializer)) {
					if (ts.isIdentifier(declaration.initializer.arguments[0])) { // The first element in the wrapper function will always be the original function
						return declaration.initializer.arguments[0].escapedText as string
					}
				}
			}
		}

	}

	// Gets the type of the node (we care only about functions or methods)
	function get_node_type(
		node: ts.Node,
		typechecker: ts.TypeChecker
	): "function" | "method" | undefined {
		const declaration =
			typechecker.getSymbolAtLocation(node).valueDeclaration;

		if (declaration.kind == ts.SyntaxKind.VariableDeclaration) {
			return "function";
		} else if (declaration.kind == ts.SyntaxKind.MethodDeclaration) {
			return "method";
		} else {
			return undefined;
		}
	}

	// Gets the node you're currently hovering over
	function get_node_at_cursor(
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

	function create_request_rate_query(nodeIdentifier: string, nodeType: string) {
		return `sum by (function, module) (rate(${nodeType}_calls_count{${nodeType}="${nodeIdentifier}"}[5m]))`;
	}

	function create_error_ratio_query(nodeIdentifier: string, nodeType: string) {
		const requestQuery = create_request_rate_query(nodeIdentifier, nodeType);
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
