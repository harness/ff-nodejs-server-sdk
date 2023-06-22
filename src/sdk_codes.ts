import { Logger } from './log';
import { Target } from './types';

interface SDKCodeMessages {
  [key: number]: string;
}

const sdkCodes: SDKCodeMessages = {
  // SDK_INIT_1xxx
  1000: 'The SDK has successfully initialized',
  1001: 'The SDK has failed to initialize due to an authentication error - defaults will be served',
  1002: 'The SDK has failed to initialize due to a missing or empty API key - defaults will be served',
  1003: 'The SDK is waiting for initialization to complete',
  // SDK_AUTH_2xxx
  2000: 'Authentication was successful',
  2001: 'Authentication failed with a non-recoverable error',
  2002: 'Authentication attempt',
  2003: 'Authentication failed and max retries have been exceeded',
  // SDK_CLOSE_3xxx
  3000: 'Closing SDK',
  3001: 'SDK Closed successfully',
  // SDK_POLL_4xxx
  4000: 'Polling started, intervalMs:',
  4001: 'Polling stopped, reason:',
  // SDK_STREAM_5xxx
  5000: 'SSE stream successfully connected',
  5001: 'SSE stream disconnected, reason:',
  5002: 'SSE event received: ',
  5003: 'SSE retrying to connect in',
  5004: 'SSE stopped',
  // SDK_EVAL_6xxx - these are hardcoded in `client.ts` as they
  // are more complex
  6000: 'Evaluation successful: ',
  6001: 'Evaluation Failed, returning default variation: ',
  // SDK_METRICS_7xxx
  7000: 'Metrics thread started with request interval:',
  7001: 'Metrics thread exited',
  7002: 'Posting metrics failed, reason:',
  7003: 'Metrics posted successfully',
  7004: 'Target metrics exceeded max size, remaining targets for this analytics interval will not be sent',
};

export function getSDKCodeMessage(key: number): string {
  if (key in sdkCodes) {
    return sdkCodes[key];
  } else {
    return 'Unknown SDK code';
  }
}

export function sdkErrMsg(errorCode: number, appendText = ''): string {
  return `SDKCODE:${errorCode}: ${getSDKCodeMessage(errorCode)} ${appendText}`;
}

export function warnMissingSDKKey(logger: Logger): void {
  logger.warn(sdkErrMsg(1002, ''));
}

export function infoPollStarted(durationSec: number, logger: Logger): void {
  logger.info(sdkErrMsg(4000, `${durationSec * 1000}`));
}

export function infoSDKInitOK(logger: Logger): void {
  logger.info(sdkErrMsg(1000, ''));
}

export function infoSDKInitWaiting(logger: Logger): void {
  logger.info(sdkErrMsg(1003, ''));
}

export function infoSDKStartClose(logger: Logger): void {
  logger.info(sdkErrMsg(3000, ''));
}

export function infoSDKCloseSuccess(logger: Logger): void {
  logger.info(sdkErrMsg(3001, ''));
}

export function infoSDKAuthOK(logger: Logger): void {
  logger.info(sdkErrMsg(2000, ''));
}

export function infoPollingStopped(reason: string, logger: Logger): void {
  logger.info(sdkErrMsg(4001, reason));
}

export function infoStreamConnected(logger: Logger): void {
  logger.info(sdkErrMsg(5000, ''));
}

export function infoStreamEventReceived(
  eventJson: string,
  logger: Logger,
): void {
  logger.info(sdkErrMsg(5002, eventJson));
}

export function infoStreamStopped(logger: Logger): void {
  logger.info(sdkErrMsg(5004, ''));
}

export function infoMetricsThreadStarted(
  interval: number,
  logger: Logger,
): void {
  logger.info(sdkErrMsg(7000, `${interval}`));
}

export function infoMetricsSuccess(logger: Logger): void {
  logger.info(sdkErrMsg(7003, ''));
}

export function infoMetricsTargetExceeded(logger: Logger): void {
  logger.info(sdkErrMsg(7004, ''));
}

export function infoMetricsThreadExited(logger: Logger): void {
  logger.info(sdkErrMsg(7001, ''));
}

export function infoEvalSuccess(result: string, flagIdentifier: string, target: Target, logger: Logger): void {
  logger.info(sdkErrMsg(6000, `result=${result}, flag identifier=${flagIdentifier}, target=${JSON.stringify(target)}`))
}

export function warnAuthFailedSrvDefaults(logger: Logger): void {
  logger.warn(sdkErrMsg(2001, ''));
}

export function warnFailedInitAuthError(logger: Logger): void {
  logger.warn(sdkErrMsg(1001, ''));
}

export function warnAuthFailedExceedRetries(logger: Logger): void {
  logger.warn(sdkErrMsg(2003, ''));
}

export function warnAuthRetrying(
  attempt: number,
  error: string,
  logger: Logger,
): void {
  logger.warn(
    sdkErrMsg(2002, `attempt ${attempt}, got error: ${error}, Retrying ...`),
  );
}

export function warnStreamDisconnected(reason: string, logger: Logger): void {
  logger.warn(sdkErrMsg(5001, reason));
}

export function warnStreamRetrying(seconds: number, logger: Logger): void {
  logger.warn(sdkErrMsg(5003, `${seconds}`));
}

export function warnPostMetricsFailed(reason: string, logger: Logger): void {
  logger.warn(sdkErrMsg(7002, reason));
}

export function warnDefaultVariationServed(
  flag: string,
  target: Target,
  defaultValue: string,
  logger: Logger,
): void {
  logger.warn(
    sdkErrMsg(6001, `default value=${defaultValue}, flag=${flag}, target=${JSON.stringify(target)}`),
  );
}
