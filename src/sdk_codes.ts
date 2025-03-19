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
  5001: 'SSE stream disconnected, reason:',  // When used with retrying, will combine with 5003
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

// Track disconnect attempts for throttling warning logs
let disconnectAttempts = 0;
let lastConnectionSuccess = 0;

// Reset disconnect counter when connection succeeds
export function resetDisconnectCounter(): void {
  disconnectAttempts = 0;
  lastConnectionSuccess = Date.now();
}


// Combined warning function for both disconnect and retry in a single message
export function warnStreamDisconnectedWithRetry(reason: string, ms: number, logger: Logger): void {
  disconnectAttempts++;

  // First disconnect after a successful connection - always warn
  // Combine both codes to create a message with both disconnect reason and retry info
  const combinedMessage = `${getSDKCodeMessage(5001)} ${reason} - ${getSDKCodeMessage(5003)} ${ms}ms`;

  if (disconnectAttempts === 1) {
    // Inform that subsequent logs will be at debug level until the 10th attempt
    logger.warn(`${combinedMessage} (subsequent logs until 10th attempt will be at DEBUG level to reduce noise)`);
  }
  // 10th disconnect - warn again with count information
  else if (disconnectAttempts === 10) {
    const timeSinceConnection = Math.floor((Date.now() - lastConnectionSuccess)/1000);
    logger.warn(`${combinedMessage} (10th attempt, connection unstable for ${timeSinceConnection} seconds, subsequent logs will be at DEBUG level except every 50th attempt)`);
  }
  // Every 50th disconnect after that - warn with count
  else if (disconnectAttempts > 10 && disconnectAttempts % 50 === 0) {
    const timeSinceConnection = Math.floor((Date.now() - lastConnectionSuccess)/1000);
    const nextWarnAt = disconnectAttempts + 50;
    logger.warn(`${combinedMessage} (${disconnectAttempts}th attempt, connection unstable for ${timeSinceConnection} seconds, next warning at ${nextWarnAt}th attempt)`);
  }
  // All other disconnect attempts - log at debug level
  else {
    logger.debug(`${combinedMessage} (attempt ${disconnectAttempts}, logging at debug level to reduce noise)`);
  }
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
