import { MetricsProcessor } from '../metrics';
import { Configuration } from '../openapi'; // Adjust import paths as necessary
import { Options } from '../types';
import events from 'events';



jest.mock('../openapi/api', () => ({
  MetricsApi: jest.fn().mockImplementation(() => ({
    postMetrics: jest.fn()
  }))
}));

describe('MetricsProcessor', () => {
  let metricsProcessor: MetricsProcessor;
  let mockEventEmitter: events.EventEmitter;
  let mockOptions: Options;
  let mockLogger: { info: jest.Mock, debug: jest.Mock, error: jest.Mock, trace: jest.Mock, warn: jest.Mock};

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogger = { info: jest.fn(), debug: jest.fn(), error: jest.fn(), trace: jest.fn(), warn: jest.fn() };
    mockEventEmitter = new events.EventEmitter();
    const mockConf = new Configuration({});
    mockOptions = { logger: mockLogger, eventsUrl: 'http://localhost', eventsSyncInterval: 10000 };

    metricsProcessor = new MetricsProcessor('test-env', '1', mockConf, mockOptions, mockEventEmitter);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should set an interval and emit "metrics_ready" when started', () => {
    const emitSpy = jest.spyOn(mockEventEmitter, 'emit');

    metricsProcessor.start();

    // Verify the logging call
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting MetricsProcessor with request interval:'), 10000);

    // Move forward in time to trigger any set intervals
    jest.runOnlyPendingTimers();

    // Verify the interval is set to call _send (implicitly checking by time advancement)
    // Note: This assumes _send logs something via debug; adjust according to your _send implementation
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Start sending metrics data'));

    // Verify the READY event was emitted
    expect(emitSpy).toHaveBeenCalledWith('metrics_ready');
  });

  // Additional tests for other methods and scenarios...
});
