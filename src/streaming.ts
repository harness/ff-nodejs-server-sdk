import * as EventSource from 'eventsource';
import EventEmitter from 'events';
import { AxiosPromise } from 'axios';
import { CacheValueType, formatFlagKey } from './cache';
import { DefaultApi } from './openapi';
import { Event, Options, StreamMsg } from './types';
import { log } from './utils';

type FetchFunction = (
  identifier: string,
  environment: string,
) => AxiosPromise<CacheValueType>;

export class StreamProcessor {
  static readonly CONNECTED = 1;

  private apiKey: string;
  private jwtToken: string;
  private environment: string;
  private options: Options;
  private cluster: string;
  private eventBus: EventEmitter;
  private api: DefaultApi;
  private eventSource: EventSource;

  constructor(
    api: DefaultApi,
    apiKey: string,
    environment: string,
    jwtToken: string,
    options: Options,
    cluster: string,
    eventBus: EventEmitter,
  ) {
    this.api = api;
    this.apiKey = apiKey;
    this.environment = environment;
    this.jwtToken = jwtToken;
    this.options = options;
    this.cluster = cluster;
    this.eventBus = eventBus;
  }

  start(): void {
    log.info('Starting StreamProcessor');
    const eventSource = new EventSource(
      `${this.options.baseUrl}/stream?cluster=${this.cluster}`,
      {
        headers: {
          Authorization: `Bearer ${this.jwtToken}`,
          'API-Key': this.apiKey,
        },
      },
    );

    eventSource.onopen = (event: MessageEvent) => {
      log.debug('Stream connected', event);
      this.eventBus.emit(Event.CONNECTED);
    };

    eventSource.onerror = (event: MessageEvent) => {
      log.debug('Stream has issue', event);
      this.eventBus.emit(Event.ERROR, event);
    };

    eventSource.addEventListener('*', (event: MessageEvent) => {
      const msg: StreamMsg = JSON.parse(event.data);

      log.debug('Received event from stream: ', msg);

      if (msg.domain === 'flag') {
        this.msgProcessor(
          msg,
          this.api.getFeatureConfigByIdentifier.bind(this.api),
          formatFlagKey,
        );
      } else if (msg.domain === 'target-segment') {
        this.msgProcessor(
          msg,
          this.api.getSegmentByIdentifier.bind(this.api),
          formatFlagKey,
        );
      }
    });

    this.eventSource = eventSource;
  }

  private async msgProcessor(
    msg: StreamMsg,
    fn: FetchFunction,
    keyFn: (key: string) => string,
  ): Promise<void> {
    log.info("Processing message", msg);
    try {
      const response = await fn(msg.identifier, this.environment);
      const data: CacheValueType = response.data;
      if (msg.event == 'create' || msg.event == 'patch') {
        this.options.cache.set(formatFlagKey(msg.identifier), data);
      } else if (msg.event == 'delete') {
        delete this.options.cache[keyFn(msg.identifier)];
      }
    } catch (error) {
      log.error(
        'Error while fetching data with identifier:',
        msg.identifier,
        error,
      );
      throw error;
    }
    log.info("Processing message finished", msg);
    return;
  }

  connected(): boolean {
    return this.eventSource.readyState == StreamProcessor.CONNECTED;
  }

  private stop(): void {
    log.info('Stopping StreamProcessor');
    this.eventSource.close();
    this.eventBus.emit(Event.DISCONNECTED);
  }

  close(): void {
    this.stop();
  }
}
