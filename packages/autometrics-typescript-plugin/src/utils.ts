import ts from "typescript/lib/tsserverlibrary";

const PLUGIN_NAME = "Autometrics TypeScript Plugin";

export function getProxy(languageService: ts.LanguageService) {
  // Set up decorator object
  const proxy: ts.LanguageService = Object.create(null);
  for (const k of Object.keys(languageService) as Array<
    keyof ts.LanguageService
  >) {
    const x = languageService[k];
    proxy[k] = (...args: Array<{}>) => x.apply(languageService, args);
  }

  return proxy;
}

export function createLogger(project: ts.server.Project) {
  return (msg: string) => {
    project.projectService.logger.info(`${PLUGIN_NAME}: ${msg}`);
  };
}

export function hasAutometricsDecorator(node: ts.Node) {
  const decorators = ts.canHaveDecorators(node) && ts.getDecorators(node);
  if (!decorators) {
    return false;
  }

  const hasAutometricsDecorator = decorators.some((decorator) =>
    decorator.getText().startsWith("@Autometrics"),
  );

  return hasAutometricsDecorator;
}
