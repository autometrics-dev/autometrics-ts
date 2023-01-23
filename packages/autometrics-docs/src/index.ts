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

		proxy.getQuickInfoAtPosition = (filename, position) => {
			const prior = languageService.getQuickInfoAtPosition(
				filename,
				position
			);

			const sourceFile = languageService
				.getProgram()
				.getSourceFile(filename);

			const nodeAtCursor = findChildContainingPosition(
				sourceFile,
				position
			);

			let function_label: string;
			debugger;

			if (ts.isIdentifier(nodeAtCursor)) {
				function_label = nodeAtCursor.escapedText as string;
			}

			let { tags, documentation } = prior;

			if (tags == undefined) {
				return prior;
			}

			const autometricsTag = tags.find((tag) => {
				if (tag.name == "autometrics") {
					return true;
				}
			});

			if (autometricsTag != undefined) {
				let latency = `sum by (le, function, module) (rate(function_calls_duration_bucket{function="${function_label}"}[5m]))`;
				latency = `# 95th and 99th percentile latencies
histogram_quantile(0.99, ${latency}) or
histogram_quantile(0.95, ${latency})`;

				const requestRate = `sum by (function, module) (rate(function_calls_duration_bucket"${function_label}"[5m]))`;
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
						text: `- [Latency (95th and 99th percentiles)](${makePrometheusUrl(
							latency
						)})`,
					},
					{
						kind: "space",
						text: "\n",
					},
					{
						kind: "string",
						text: `- [Request rate](${makePrometheusUrl(
							requestRate
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
					tags,
					documentation,
				};
			}

			return prior;
		};

		return proxy;
	}

	function makePrometheusUrl(query: string) {
		const base = "http://localhost:9091/";
		return (
			base + "graph?g0.expr=" + encodeURIComponent(query) + "&g0.tab=0"
		);
	}

	function findChildContainingPosition(
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

	return { create };
}

export = init;
