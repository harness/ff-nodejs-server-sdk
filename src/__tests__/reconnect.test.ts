import { AxiosResponse } from 'axios';
import LRU from 'lru-cache';
import Client from '../client';
import { defaultOptions } from '../constants';
import { ClientApi, FeatureConfig, Segment } from '../openapi';
import { StreamProcessor } from '../streaming';
import { StreamEvent } from '../types';

jest.mock('../openapi/api');
jest.mock('../streaming');
jest.mock('jwt-decode', () => () => ({ environment: 'env' }));

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const response = (data: unknown) => ({ data }) as AxiosResponse;
const flush = () =>
  new Promise<void>(jest.requireActual('timers').setImmediate);

describe('stream reconnect refresh', () => {
  let client: Client;
  let flags: jest.SpyInstance;
  let segments: jest.SpyInstance;
  let connected: jest.SpyInstance;
  const logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest
      .spyOn(ClientApi.prototype, 'authenticate')
      .mockResolvedValue(response({ authToken: 'token' }));
    flags = jest
      .spyOn(ClientApi.prototype, 'getFeatureConfig')
      .mockResolvedValue(response([{ feature: 'flag', version: 1 }]));
    segments = jest
      .spyOn(ClientApi.prototype, 'getAllSegments')
      .mockResolvedValue(
        response([{ identifier: 'segment', version: 1, servingRules: [] }]),
      );
    connected = jest
      .spyOn(StreamProcessor.prototype, 'connected')
      .mockReturnValue(true);
    client = new Client('key', {
      enableAnalytics: false,
      logger,
      cache: new LRU({ max: 100 }),
      store: undefined,
    });
    await flush();
  });

  afterEach(() => {
    connected.mockReturnValue(false);
    client.close();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('refreshes missed flags and segments even immediately after a poll', async () => {
    const stop = jest.spyOn(client['pollProcessor'], 'stop');
    flags.mockResolvedValue(response([{ feature: 'flag', version: 2 }]));
    segments.mockResolvedValue(
      response([{ identifier: 'segment', version: 2, servingRules: [] }]),
    );

    client['eventBus'].emit(StreamEvent.CONNECTED);
    expect(stop).not.toHaveBeenCalled();
    await flush();

    expect(flags).toHaveBeenCalledTimes(2);
    expect(segments).toHaveBeenCalledTimes(2);
    expect(await client['repository'].getFlag('flag')).toMatchObject({
      version: 2,
    });
    expect(await client['repository'].getSegment('segment')).toMatchObject({
      version: 2,
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('waits for both cache writes before stopping polling', async () => {
    const flagWrite = deferred<void>();
    const segmentWrite = deferred<void>();
    jest
      .spyOn(client['repository'], 'setFlag')
      .mockReturnValueOnce(flagWrite.promise);
    jest
      .spyOn(client['repository'], 'setSegment')
      .mockReturnValueOnce(segmentWrite.promise);
    const stop = jest.spyOn(client['pollProcessor'], 'stop');

    client['eventBus'].emit(StreamEvent.CONNECTED);
    await flush();
    flagWrite.resolve();
    await flush();
    expect(stop).not.toHaveBeenCalled();
    segmentWrite.resolve();
    await flush();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it.each(['flags', 'segments', 'cache'])(
    'continues polling after a %s refresh failure',
    async (failure) => {
      const stop = jest.spyOn(client['pollProcessor'], 'stop');
      const error = new Error('refresh failed');
      if (failure === 'flags') {
        flags.mockRejectedValueOnce(error);
      } else if (failure === 'segments') {
        segments.mockRejectedValueOnce(error);
      } else {
        jest
          .spyOn(client['repository'], 'setFlag')
          .mockRejectedValueOnce(error);
      }

      client['eventBus'].emit(StreamEvent.CONNECTED);
      await flush();
      expect(stop).not.toHaveBeenCalled();
      const requests = flags.mock.calls.length;
      jest.advanceTimersByTime(defaultOptions.pollInterval);
      await flush();
      expect(flags).toHaveBeenCalledTimes(requests + 1);
    },
  );

  it('does not stop fallback polling if the stream disconnects during refresh', async () => {
    const pending = deferred<AxiosResponse>();
    flags.mockReturnValueOnce(pending.promise);
    const stop = jest.spyOn(client['pollProcessor'], 'stop');
    client['eventBus'].emit(StreamEvent.CONNECTED);
    connected.mockReturnValue(false);
    client['eventBus'].emit(StreamEvent.RETRYING);
    pending.resolve(response([]));
    await flush();
    expect(stop).not.toHaveBeenCalled();
  });

  it('ignores completion from an older connection while the new refresh is pending', async () => {
    const oldRefresh = deferred<AxiosResponse>();
    const newRefresh = deferred<AxiosResponse>();
    flags
      .mockReturnValueOnce(oldRefresh.promise)
      .mockReturnValueOnce(newRefresh.promise);
    const stop = jest.spyOn(client['pollProcessor'], 'stop');
    client['eventBus'].emit(StreamEvent.CONNECTED);
    connected.mockReturnValue(false);
    client['eventBus'].emit(StreamEvent.RETRYING);
    connected.mockReturnValue(true);
    client['eventBus'].emit(StreamEvent.CONNECTED);

    oldRefresh.resolve(response([]));
    await flush();
    expect(stop).not.toHaveBeenCalled();
    newRefresh.resolve(response([]));
    await flush();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('preserves newer cached versions when a refresh returns older data', async () => {
    const pending = deferred<AxiosResponse>();
    flags.mockReturnValueOnce(pending.promise);
    client['eventBus'].emit(StreamEvent.CONNECTED);
    await client['repository'].setFlag('flag', {
      feature: 'flag',
      version: 3,
    } as FeatureConfig);
    await client['repository'].setSegment('segment', {
      identifier: 'segment',
      version: 3,
      servingRules: [],
    } as Segment);
    pending.resolve(response([{ feature: 'flag', version: 2 }]));
    await flush();
    expect(await client['repository'].getFlag('flag')).toMatchObject({
      version: 3,
    });
    expect(await client['repository'].getSegment('segment')).toMatchObject({
      version: 3,
    });
  });
});
