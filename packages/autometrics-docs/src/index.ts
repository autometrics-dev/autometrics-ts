import {
	getNodeAtCursor,
	getNodeType,
	getNodeIdentifier,
	isAutometricsWrappedOrDecorated,
} from "./astHelpers";

import {
	createLatencyQuery,
	createRequestRateQuery,
	createErrorRatioQuery,
	makePrometheusUrl,
} from "./queryHelpers";

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
			"I'm getting set up now! Check the log for this message.",
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
				position,
			);

			if (prior === undefined) {
				return prior;
			}

			let { documentation } = prior;

			const sourceFile = languageService.getProgram().getSourceFile(filename);

			const nodeAtCursor = getNodeAtCursor(sourceFile, position);

			const nodeType = getNodeType(nodeAtCursor, typechecker);

			const autometrics = isAutometricsWrappedOrDecorated(
				nodeAtCursor,
				typechecker,
			);

			// If either autometrics checker or node type is undefined
			// return early
			if (!autometrics) {
				return prior;
			}

			if (!nodeType) {
				return prior;
			}

			const nodeIdentifier = getNodeIdentifier(
				nodeAtCursor,
				nodeType,
				typechecker,
			);

			const latency = createLatencyQuery(nodeIdentifier, nodeType);
			const requestRate = createRequestRateQuery(nodeIdentifier, nodeType);
			const errorRatio = createErrorRatioQuery(nodeIdentifier, nodeType);

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
					text: `- [Request rate](${makePrometheusUrl(
						requestRate,
						prometheusBase,
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
						prometheusBase,
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
						prometheusBase,
					)})`,
				},
				{
					kind: "space",
					text: "\n",
				},
			];
			documentation = documentation.concat(preamble, documentation, queries);

			return <ts.QuickInfo>{
				...prior,
				documentation,
			};
		};

		return proxy;
	}

	return { create };
}

export = init;
