export interface Logger {
  trace(message?: any, ...optionalParams: any[]): void;
  debug(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  [x: string]: any;
}

// Wrapper for console
export class ConsoleLog implements Logger {
  [x: string]: any;

  trace(message?: any, ...optionalParams: any[]): void {
    console.trace(message, ...optionalParams);
  }
  debug(message?: any, ...optionalParams: any[]): void {
    console.debug(message, ...optionalParams);
  }
  info(message?: any, ...optionalParams: any[]): void {
    console.info(message, ...optionalParams);
  }
  warn(message?: any, ...optionalParams: any[]): void {
    console.warn(message, ...optionalParams);
  }
  error(message?: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }
}
