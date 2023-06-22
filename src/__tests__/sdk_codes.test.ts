import { ConsoleLog, Logger } from "../log";
import * as sdkCodes from '../sdk_codes';


describe('SDK Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new ConsoleLog()
  });

  test('Run all sdk_code functions without raising exceptions', () => {
    expect(() => {
      sdkCodes.infoSDKInitOK(logger);
      sdkCodes.infoSDKCloseSuccess(logger);
      sdkCodes.infoMetricsThreadStarted(5000, logger);
      // Call other functions here
    }).not.toThrow();
  });
});
