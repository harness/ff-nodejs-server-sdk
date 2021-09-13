export interface Logger {
  trace(message?: unknown, ...optionalParams: unknown[]): void;
  debug(message?: unknown, ...optionalParams: unknown[]): void;
  info(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
  error(message?: unknown, ...optionalParams: unknown[]): void;
}

// Wrapper for console
export class ConsoleLog implements Logger {
  trace(message?: unknown, ...optionalParams: unknown[]): void {
    console.trace(message, ...optionalParams);
  }
  debug(message?: unknown, ...optionalParams: unknown[]): void {
    console.debug(message, ...optionalParams);
  }
  info(message?: unknown, ...optionalParams: unknown[]): void {
    console.info(message, ...optionalParams);
  }
  warn(message?: unknown, ...optionalParams: unknown[]): void {
    console.warn(message, ...optionalParams);
  }
  error(message?: unknown, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}
