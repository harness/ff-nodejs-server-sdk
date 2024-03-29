import Client from '../client';
import { PollingProcessor } from '../polling';
import { defaultOptions } from '../constants';

jest.mock('../openapi/api');

describe('Client', () => {
  let clients: Client[] = [];

  afterEach(() => {
    jest.resetAllMocks();

    clients.forEach((client) => client.close());
    clients = [];
  });

  it('should warn if poll interval is set below the default', async () => {
    jest.spyOn(PollingProcessor.prototype, 'start').mockReturnValue(undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockReturnValue(undefined);

    clients.push(
      new Client('some key', {
        pollInterval: defaultOptions.pollInterval,
        enableAnalytics: false,
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockReset();

    clients.push(
      new Client('some key', {
        pollInterval: defaultOptions.pollInterval - 1,
        enableAnalytics: false,
      }),
    );
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockReset();

    clients.push(
      new Client('some key', {
        pollInterval: defaultOptions.pollInterval + 1,
        enableAnalytics: false,
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should warn if events sync interval is set below the default', async () => {
    jest.spyOn(PollingProcessor.prototype, 'start').mockReturnValue(undefined);
    const warnSpy = jest.spyOn(console, 'warn');

    clients.push(
      new Client('some key', {
        eventsSyncInterval: defaultOptions.eventsSyncInterval,
        enableAnalytics: false,
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockReset();

    clients.push(
      new Client('some key', {
        eventsSyncInterval: defaultOptions.eventsSyncInterval - 1,
        enableAnalytics: false,
      }),
    );

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockReset();

    clients.push(
      new Client('some key', {
        eventsSyncInterval: defaultOptions.eventsSyncInterval + 1,
        enableAnalytics: false,
      }),
    );

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
