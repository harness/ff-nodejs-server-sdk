import { Logger } from './log';
import { Target } from './types';
import { VERSION } from './version';

const sdkCodes: Record<number, string> = {
  // SDK_INIT_1xxx
  1000: 'The SDK has successfully initialized, version ' + VERSION,
  1001: 'The SDK has failed to initialize due to an authentication error - defaults will be served',
  1002: 'The SDK has failed to initialize due to a missing or empty API key - defaults will be served',
  // SDK_AUTH_2xxx
  2000: 'Authentication was successful',
  2001: 'Authentication failed with a non-recoverable error',
  2002: 'Authentication attempt failed:',
  2003: 'Authentication failed and max retries have been exceeded',
  // SDK_CLOSE_3xxx
  3000: 'Closing SDK',
  3001: 'SDK Closed successfully',
  // SDK_POLL_4xxx
  4000: 'Polling started, interval:',
  4001: 'Polling stopped',
  // SDK_STREAM_5xxx
  5000: 'SSE stream successfully connected',
  5001: 'SSE stream disconnected, reason:',
  5002: 'SSE event received',
  5003: 'SSE retrying to connect in',
  5004: 'SSE stopped',
  // SDK_EVAL_6xxx -
  6000: 'Evaluation successful: ',
  6001: 'Evaluation Failed, returning default variation: ',
  6002: "BucketBy attribute not found in target attributes, falling back to 'identifier':",
  // SDK_METRICS_7xxx
  7000: 'Metrics thread started with request interval:',
  7001: 'Metrics stopped',
  7002: 'Posting metrics failed, reason:',
  7003: 'Metrics posted successfully',
  7004: 'Target metrics exceeded max size, remaining targets for this analytics interval will not be sent',
  7007: 'Evaluation metrics exceeded max size, remaining evaluations for this analytics interval will not be sent'
};

function getSDKCodeMessage(key: number): string {
  if (key in sdkCodes) {
    return sdkCodes[key];
  } else {
    return 'Unknown SDK code';
  }
}

function getSdkErrMsg(
  errorCode: number,
  appendText: string | number = '',
): string {
  return `SDKCODE:${errorCode}: ${getSDKCodeMessage(
    errorCode,
  )} ${appendText}`;
}

export function warnMissingSDKKey(logger: Logger): void {
  logger.warn(getSdkErrMsg(1002));
}

export function infoPollStarted(durationMS: number, logger: Logger): void {
  logger.info(getSdkErrMsg(4000, durationMS / 1000 + ' seconds'));
}

export function infoSDKInitOK(logger: Logger): void {
  logger.info(getSdkErrMsg(1000));
}

export function infoSDKStartClose(logger: Logger): void {
  logger.info(getSdkErrMsg(3000));
}

export function infoSDKCloseSuccess(logger: Logger): void {
  logger.info(getSdkErrMsg(3001));
}

export function infoSDKAuthOK(logger: Logger): void {
  logger.info(getSdkErrMsg(2000));
}

export function infoPollingStopped(logger: Logger): void {
  logger.info(getSdkErrMsg(4001));
}

export function infoStreamConnected(logger: Logger): void {
  logger.info(getSdkErrMsg(5000));
}

export function debugStreamEventReceived(logger: Logger): void {
  logger.debug(getSdkErrMsg(5002));
}

export function infoStreamStopped(logger: Logger): void {
  logger.info(getSdkErrMsg(5004));
}

export function infoMetricsThreadStarted(
  interval: number,
  logger: Logger,
): void {
  logger.info(getSdkErrMsg(7000, interval / 1000 + ' seconds'));
}

export function infoMetricsSuccess(logger: Logger): void {
  logger.info(getSdkErrMsg(7003));
}

export function infoMetricsThreadExited(logger: Logger): void {
  logger.info(getSdkErrMsg(7001));
}

export function warnTargetMetricsExceeded(logger: Logger): void {
  logger.warn(getSdkErrMsg(7004));
}

export function warnEvaluationMetricsExceeded(logger: Logger): void {
  logger.warn(getSdkErrMsg(7007));
}

export function debugEvalSuccess(
  result: string,
  flagIdentifier: string,
  target: Target,
  logger: Logger,
): void {
  logger.debug(
    getSdkErrMsg(
      6000,
      `result=${result}, flag identifier=${flagIdentifier}, target=${JSON.stringify(
        target,
      )}`,
    ),
  );
}

export function warnAuthFailedSrvDefaults(logger: Logger): void {
  logger.warn(getSdkErrMsg(2001));
}

export function warnFailedInitAuthError(logger: Logger): void {
  logger.warn(getSdkErrMsg(1001));
}

export function warnAuthFailedExceedRetries(logger: Logger): void {
  logger.warn(getSdkErrMsg(2003));
}

export function warnAuthRetrying(
  attempt: number,
  error: string,
  logger: Logger,
): void {
  logger.warn(
    getSdkErrMsg(
      2002,
      `attempt=${attempt}, error=${error}, continue retrying=true`,
    ),
  );
}

export function warnStreamDisconnected(reason: string, logger: Logger): void {
  logger.warn(getSdkErrMsg(5001, reason));
}

export function warnStreamRetrying(seconds: number, logger: Logger): void {
  logger.warn(getSdkErrMsg(5003, `${seconds}`));
}

export function warnPostMetricsFailed(reason: string, logger: Logger): void {
  logger.warn(getSdkErrMsg(7002, reason));
}

export function warnDefaultVariationServed(
  flag: string,
  target: Target,
  defaultValue: string,
  logger: Logger,
): void {
  logger.warn(
    getSdkErrMsg(
      6001,
      `default variation used=${defaultValue}, flag=${flag}, target=${JSON.stringify(
        target,
      )}`,
    ),
  );
}

export function warnBucketByAttributeNotFound(
  bucketBy: string,
  usingValue: string,
  logger: Logger,
): void {
  logger.warn(
    getSdkErrMsg(6002, `missing=${bucketBy}, using value=${usingValue}`),
  );
}
