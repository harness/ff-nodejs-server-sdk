import Client from '../client';
import { PollingProcessor } from '../polling';
import { defaultOptions } from '../constants';

jest.mock('../openapi/api');

describe('Client', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should close the client when the close method is called', async () => {
    // given
    const start = jest.spyOn(PollingProcessor.prototype, 'start');
    const close = jest.spyOn(PollingProcessor.prototype, 'close');

    // when
    const client = new Client('some key', {
      enableAnalytics: false,
    });
    await client.waitForInitialization();

    client.close();

    // then
    expect(start).toBeCalledTimes(1);
    expect(close).toBeCalledTimes(1);
  });

  it('should warn if poll interval is set below the default', async () => {
    jest.spyOn(PollingProcessor.prototype, 'start').mockReturnValue(undefined)
    const warnSpy = jest.spyOn(console, 'warn').mockReturnValue(undefined);

    new Client('some key', {
      pollInterval: defaultOptions.pollInterval,
      enableAnalytics: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockReset();

    new Client('some key', {
      pollInterval: defaultOptions.pollInterval - 1,
      enableAnalytics: false,
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockReset();

    new Client('some key', {
      pollInterval: defaultOptions.pollInterval + 1,
      enableAnalytics: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should warn if events sync interval is set below the default', async () => {
    jest.spyOn(PollingProcessor.prototype, 'start').mockReturnValue(undefined)
    const warnSpy = jest.spyOn(console, 'warn');

    new Client('some key', {
      eventsSyncInterval: defaultOptions.eventsSyncInterval,
      enableAnalytics: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockReset();

    new Client('some key', {
      eventsSyncInterval: defaultOptions.eventsSyncInterval - 1,
      enableAnalytics: false,
    });

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockReset();

    new Client('some key', {
      eventsSyncInterval: defaultOptions.eventsSyncInterval + 1,
      enableAnalytics: false,
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
