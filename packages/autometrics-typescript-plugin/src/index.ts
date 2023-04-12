import {
  getNodeAtCursor,
  getNodeType,
  getNodeIdentifier,
  isAutometricsWrappedOrDecorated,
} from "./astHelpers";

import tsserver from "typescript/lib/tsserverlibrary";

import {
  createLatencyQuery,
  createRequestRateQuery,
  createErrorRatioQuery,
  makePrometheusUrl,
} from "./queryHelpers";

import { createLogger, getProxy } from "./utils";

function init(modules: {
  typescript: typeof tsserver;
}) {
  const ts = modules.typescript;

  function create({
    config,
    languageService,
    project,
  }: ts.server.PluginCreateInfo) {
    // Diagnostic logging
    const log = (msg: string) => {
      project.projectService.logger.info(`${PLUGIN_NAME}: ${msg}`);
    };

    log("started");


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

      const requestRate = createRequestRateQuery(nodeIdentifier, nodeType);
      const errorRatio = createErrorRatioQuery(nodeIdentifier, nodeType);
      const latency = createLatencyQuery(nodeIdentifier, nodeType);

      const requestRateUrl = makePrometheusUrl(requestRate, prometheusBase);
      const errorRatioUrl = makePrometheusUrl(errorRatio, prometheusBase);
      const latencyUrl = makePrometheusUrl(latency, prometheusBase);

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
          text: `- [Request rate](${requestRateUrl})`,
        },
        {
          kind: "space",
          text: "\n",
        },
        {
          kind: "string",
          text: `- [Error ratio](${errorRatioUrl})`,
        },
        {
          kind: "space",
          text: "\n",
        },
        {
          kind: "string",
          text: `- [Latency (95th and 99th percentiles)](${latencyUrl})`,
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
