import ts, { server } from "typescript/lib/tsserverlibrary";

import {
  getNodeAtCursor,
  getNodeIdentifier,
  getNodeType,
  isAutometricsWrappedOrDecorated,
} from "./astHelpers";
import {
  createErrorRatioQuery,
  createLatencyQuery,
  createRequestRateQuery,
  makePrometheusUrl,
} from "./queryHelpers";
import { Tsserver } from "./types";
import { createLogger, getProxy } from "./utils";

type Config = {
  prometheusUrl?: string;
  docsOutputFormat?: "prometheus" | "vscode";
};

function init(modules: { typescript: Tsserver }) {
  let pluginConfig: Config;
  const ts = modules.typescript;

  function create({
    config,
    languageService,
    project,
  }: server.PluginCreateInfo) {
    const log = createLogger(project);
    log("started");

    pluginConfig = config;

    const proxy = getProxy(languageService);

    proxy.getQuickInfoAtPosition = (filename, position) => {
      const typechecker = languageService.getProgram()?.getTypeChecker();
      const sourceFile = languageService.getProgram()?.getSourceFile(filename);
      const prior: ts.QuickInfo | undefined =
        languageService.getQuickInfoAtPosition(filename, position);

      if (!prior || !sourceFile || !typechecker) {
        return;
      }

      const nodeAtCursor = getNodeAtCursor(sourceFile, position, ts);
      if (!nodeAtCursor) {
        return prior;
      }

      const nodeType = getNodeType(nodeAtCursor, typechecker, ts);
      if (!nodeType) {
        return prior;
      }

      const autometrics = isAutometricsWrappedOrDecorated(
        nodeAtCursor,
        typechecker,
        ts,
      );
      const nodeIdentifier = getNodeIdentifier(
        nodeAtCursor,
        nodeType,
        typechecker,
        ts,
      );
      if (!autometrics || !nodeIdentifier) {
        return prior;
      }

      // The output of this plugin will
      // be an html comment containing a the name of the function in a special format
      // that the vscode extension can parse.
      const docsOutputFormat = pluginConfig.docsOutputFormat || "prometheus";
      if (docsOutputFormat === "vscode") {
        const preamble = {
          kind: "string",
          text: `\n\n<!-- autometrics_fn: ${nodeIdentifier} -->\n`,
        };
        const { documentation } = prior;
        const enrichedDocumentation = documentation?.concat(
          preamble,
          documentation,
        );

        return {
          ...prior,
          documentation: enrichedDocumentation,
        };
      }

      const prometheusBase = pluginConfig.prometheusUrl;
      log(prometheusBase ?? "<no Prometheus URL set>");

      const requestRate = createRequestRateQuery("function", nodeIdentifier);
      const requestRateUrl = makePrometheusUrl(requestRate, prometheusBase);

      const calleeRequestRate = createRequestRateQuery(
        "caller",
        nodeIdentifier,
      );
      const calleeRequestRateUrl = makePrometheusUrl(
        calleeRequestRate,
        prometheusBase,
      );

      const errorRatio = createErrorRatioQuery("function", nodeIdentifier);
      const errorRatioUrl = makePrometheusUrl(errorRatio, prometheusBase);

      const calleeErrorRatio = createErrorRatioQuery("caller", nodeIdentifier);
      const calleeErrorRatioUrl = makePrometheusUrl(
        calleeErrorRatio,
        prometheusBase,
      );

      const latency = createLatencyQuery(nodeIdentifier);
      const latencyUrl = makePrometheusUrl(latency, prometheusBase);

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
        {
          kind: "space",
          text: "\n",
        },
        {
          kind: "string",
          text: `Or, dig into the metrics of *functions called by* \`${nodeIdentifier}\``,
        },
        {
          kind: "space",
          text: "\n",
        },
        {
          kind: "string",
          text: `- [Request rate](${calleeRequestRateUrl})`,
        },
        {
          kind: "space",
          text: "\n",
        },
        {
          kind: "string",
          text: `- [Error ratio](${calleeErrorRatioUrl})`,
        },
        {
          kind: "space",
          text: "\n",
        },
      ];

      const preamble = {
        kind: "string",
        text: `\n\n## Autometrics\n\nView the live metrics for the \`${nodeIdentifier}\` function:\n `,
      };
      const { documentation } = prior;
      const enrichedDocumentation = documentation?.concat(
        preamble,
        documentation,
        queries,
      );

      return {
        ...prior,
        documentation: enrichedDocumentation,
      };
    };

    return proxy;
  }

  function onConfigurationChanged(newConfig: Config) {
    pluginConfig = newConfig;
  }

  return { create, onConfigurationChanged };
}

export = init;
