import { Logger } from './log';

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
  // SDK_EVAL_6xxx - these are hardcoded in `variation.py` as they
  // are more complex
  // SDK_METRICS_7xxx
  7000: 'Metrics thread started with request interval:',
  7001: 'Metrics thread exited',
  7002: 'Posting metrics failed, reason:',
  7003: 'Metrics posted successfully',
  7004: 'Target metrics exceeded max size, remaining targets for this analytics interval will not be sent',
};

function getSDKCodeMessage(key: number): string {
  if (key in sdkCodes) {
    return sdkCodes[key];
  } else {
    return 'Unknown SDK code';
  }
}

function sdkErrMsg(
  errorCode: number,
  appendText = '',
): String {
  return `SDKCODE:${errorCode}: ${getSDKCodeMessage(
    errorCode
  )} ${appendText}`;}

function warnMissingSDKKey(logger: Logger): void {
  logger.warn(sdkErrMsg(1002, ''));
}

function infoPollStarted(durationSec: number, logger: Logger): void {
  logger.info(sdkErrMsg(4000, `${durationSec * 1000}`));
}

function infoSDKInitOK(logger: Logger): void {
  logger.info(sdkErrMsg(1000, ''));
}

function infoSDKInitWaiting(logger: Logger): void {
  logger.info(sdkErrMsg(1003, ''));
}

function infoSDKStartClose(logger: Logger): void {
  logger.info(sdkErrMsg(3000, ''));
}

function infoSDKCloseSuccess(logger: Logger): void {
  logger.info(sdkErrMsg(3001, ''));
}

function infoSDKAuthOK(logger: Logger): void {
  logger.info(sdkErrMsg(2000, ''));
}

function infoPollingStopped(reason: string, logger: Logger): void {
  logger.info(sdkErrMsg(4001, reason));
}

function infoStreamConnected(logger: Logger): void {
  logger.info(sdkErrMsg(5000, ''));
}

function infoStreamEventReceived(eventJson: string, logger: Logger): void {
  logger.info(sdkErrMsg(5002, eventJson));
}

function infoStreamStopped(logger: Logger): void {
  logger.info(sdkErrMsg(5004, ''));
}

function infoMetricsThreadStarted(interval: number, logger: Logger): void {
  logger.info(sdkErrMsg(7000, `${interval}`));
}

function infoMetricsSuccess(logger: Logger): void {
  logger.info(sdkErrMsg(7003, ''));
}

function infoMetricsTargetExceeded(logger: Logger): void {
  logger.info(sdkErrMsg(7004, ''));
}

function infoMetricsThreadExited(logger: Logger): void {
  logger.info(sdkErrMsg(7001, ''));
}

function infoEvalSuccess(logger: Logger): void {
  logger.info(sdkErrMsg(6000, ''));
}

function warnAuthFailedSrvDefaults(logger: Logger): void {
  logger.warn(sdkErrMsg(2001, ''));
}

function warnFailedInitAuthError(logger: Logger): void {
  logger.warn(sdkErrMsg(1001, ''));
}

function warnAuthFailedExceedRetries(logger: Logger): void {
  logger.warn(sdkErrMsg(2003, ''));
}

function warnAuthRetrying(
  attempt: number,
  error: string,
  logger: Logger
): void {
  logger.warn(sdkErrMsg(
    2002,
    `attempt ${attempt}, got error: ${error}, Retrying ...`
  ));
}

function warnStreamDisconnected(reason: string, logger: Logger): void {
  logger.warn(sdkErrMsg(5001, reason));
}

function warnStreamRetrying(seconds: number, logger: Logger): void {
  logger.warn(sdkErrMsg(5003, `${seconds}`));
}

function warnPostMetricsFailed(reason: string, logger: Logger): void {
  logger.warn(sdkErrMsg(7002, reason));
}

function warnDefaultVariationServed(
  flag: string,
  target: string,
  defaultValue: string,
  logger: Logger
): void {
  logger.warn(sdkErrMsg(
    6001,
    `flag=${flag}, target=${target}, default=${defaultValue}`,
  ));
}
