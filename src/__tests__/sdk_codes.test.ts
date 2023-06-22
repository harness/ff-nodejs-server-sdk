import { Logger } from "../log";
import * as sdkCodes from '../sdk_codes';

describe('SDK Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  test('Run all sdk_code functions without raising exceptions', () => {
    expect(() => {
      sdkCodes.infoSDKInitOK(logger);
      sdkCodes.infoSDKCloseSuccess(logger);
      sdkCodes.infoMetricsThreadStarted(5000, logger);
      sdkCodes.infoPollStarted(60, logger)
      sdkCodes.infoSDKStartClose( logger)
      sdkCodes.infoSDKAuthOK( logger)
      sdkCodes.infoPollingStopped("Dummy reason", logger)
      sdkCodes.infoStreamConnected( logger)
      sdkCodes.infoStreamEventReceived( "Dummy event", logger)
      sdkCodes.infoStreamStopped( logger)
      sdkCodes.infoMetricsSuccess( logger)
      sdkCodes.infoMetricsTargetExceeded( logger)
      sdkCodes.infoMetricsThreadExited( logger)
      sdkCodes.debugEvalSuccess("dummy result", "dummy identifier", { name: "dummy", identifier: "dummy"}, logger)
      sdkCodes.warnAuthFailedSrvDefaults( logger)
      sdkCodes.warnMissingSDKKey( logger)
      sdkCodes.warnFailedInitAuthError( logger)
      sdkCodes.warnAuthFailedExceedRetries( logger)
      sdkCodes.warnAuthRetrying(1, "dummy error", logger)
      sdkCodes.warnStreamDisconnected("dummy reason", logger)
      sdkCodes.warnStreamRetrying(4, logger)
      sdkCodes.warnPostMetricsFailed("dummy error", logger)
      sdkCodes.warnDefaultVariationServed("flag", { name: "dummy", identifier: "dummy"}, "default value", logger)
    }).not.toThrow();
  });
});
