export function debug(message: string) {
  console.debug(`[Autometrics] ${message}`);
}

export function info(message: string) {
  console.info(`[Autometrics] ${message}`);
}

export function trace(message: string, ...args: Array<unknown>) {
  console.trace(`[Autometrics] ${message}`, ...args);
}

export function warn(message: string) {
  console.warn(`[Autometrics] ${message}`);
}
