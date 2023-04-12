import type ts from "typescript/lib/tsserverlibrary";

const PLUGIN_NAME = "Autometrics TypeScript Plugin";

export function getProxy(languageService: ts.LanguageService) {
  // Set up decorator object
  const proxy: ts.LanguageService = Object.create(null);
  // rome-ignore lint/style/useConst: <explanation>
  for (let k of Object.keys(languageService) as Array<
    keyof ts.LanguageService
  >) {
    // rome-ignore lint/style/noNonNullAssertion: <explanation>
    const x = languageService[k]!;
    proxy[k] = (...args: Array<{}>) => x.apply(languageService, args);
  }

  return proxy
}

export function createLogger(project: ts.server.Project) {
  return (msg: string) => {
    project.projectService.logger.info(`${PLUGIN_NAME}: ${msg}`);
  };
}
