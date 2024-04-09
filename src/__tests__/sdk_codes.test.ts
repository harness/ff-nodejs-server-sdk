import type { Logger } from '../log';
import * as sdkCodes from '../sdk_codes';

describe('SDK Codes', () => {
  const logger: Logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  test.each([
    ['infoSDKInitOK', [logger]],
    ['infoSDKCloseSuccess', [logger]],
    ['infoMetricsThreadStarted', [5000, logger]],
    ['infoPollStarted', [60, logger]],
    ['infoSDKStartClose', [logger]],
    ['infoSDKAuthOK', [logger]],
    ['infoPollingStopped', [logger]],
    ['infoStreamConnected', [logger]],
    ['debugStreamEventReceived', [logger]],
    ['infoStreamStopped', [logger]],
    ['infoMetricsSuccess', [logger]],
    ['infoTargetMetricsExceeded', [logger]],
    ['infoEvaluationMetricsExceeded', [logger]],
    ['infoMetricsThreadExited', [logger]],
    [
      'debugEvalSuccess',
      [
        'dummy result',
        'dummy identifier',
        { name: 'dummy', identifier: 'dummy' },
        logger,
      ],
    ],
    ['warnAuthFailedSrvDefaults', [logger]],
    ['warnMissingSDKKey', [logger]],
    ['warnFailedInitAuthError', [logger]],
    ['warnAuthFailedExceedRetries', [logger]],
    ['warnAuthRetrying', [1, 'dummy error', logger]],
    ['warnStreamDisconnected', ['dummy reason', logger]],
    ['warnStreamRetrying', [4, logger]],
    ['warnPostMetricsFailed', ['dummy error', logger]],
    [
      'warnDefaultVariationServed',
      ['flag', { name: 'dummy', identifier: 'dummy' }, 'default value', logger],
    ],
    ['warnBucketByAttributeNotFound', ['dummy1', 'dummy2', logger]],
  ])('it should not throw when %s is called', (fn, args) => {
    expect(() => sdkCodes[fn](...args)).not.toThrow();
  });
});
