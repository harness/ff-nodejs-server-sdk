import EventSource from 'harness-eventsource';
import EventEmitter from 'events';
import { AxiosPromise } from 'axios';
import { ClientApi, FeatureConfig, Segment } from './openapi';
import { StreamEvent, Options, StreamMsg } from './types';
import { Repository } from './repository';
import { ConsoleLog } from './log';

type FetchFunction = (
  identifier: string,
  environment: string,
  cluster: string,
) => AxiosPromise<FeatureConfig | Segment>;

export class StreamProcessor {
  static readonly CONNECTED = 1;

  private apiKey: string;
  private jwtToken: string;
  private environment: string;
  private options: Options;
  private cluster: string;
  private eventBus: EventEmitter;
  private api: ClientApi;
  private eventSource: EventSource;
  private repository: Repository;
  private log: ConsoleLog;

  constructor(
    api: ClientApi,
    apiKey: string,
    environment: string,
    jwtToken: string,
    options: Options,
    cluster: string,
    eventBus: EventEmitter,
    repository: Repository,
  ) {
    this.api = api;
    this.apiKey = apiKey;
    this.environment = environment;
    this.jwtToken = jwtToken;
    this.options = options;
    this.cluster = cluster;
    this.eventBus = eventBus;
    this.repository = repository;
    this.log = this.options.logger;
  }

  start(): void {
    this.log.info('Starting StreamProcessor');
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
      this.log.debug('Stream connected', event);
      this.eventBus.emit(StreamEvent.CONNECTED);
    };

    eventSource.onretrying = (event: MessageEvent) => {
      this.log.debug('Stream is trying to reconnect', event);
      this.eventBus.emit(StreamEvent.ERROR, event);
    };

    eventSource.onerror = (event: MessageEvent) => {
      this.log.debug('Stream has issue', event);
      this.eventBus.emit(StreamEvent.ERROR, event);
    };

    eventSource.addEventListener('*', (event: MessageEvent) => {
      const msg: StreamMsg = JSON.parse(event.data);

      this.log.debug('Received event from stream: ', msg);

      if (msg.domain === 'flag') {
        this.msgProcessor(
          msg,
          this.api.getFeatureConfigByIdentifier.bind(this.api),
          this.repository.setFlag.bind(this.repository),
          this.repository.deleteFlag.bind(this.repository),
        );
      } else if (msg.domain === 'target-segment') {
        this.msgProcessor(
          msg,
          this.api.getSegmentByIdentifier.bind(this.api),
          this.repository.setSegment.bind(this.repository),
          this.repository.deleteSegment.bind(this.repository),
        );
      }
    });

    this.eventSource = eventSource;
    this.eventBus.emit(StreamEvent.READY);
  }

  private async msgProcessor(
    msg: StreamMsg,
    fn: FetchFunction,
    setFn: (identifier: string, data: FeatureConfig | Segment) => void,
    delFn: (identifier: string) => void,
  ): Promise<void> {
    this.log.info('Processing message', msg);
    try {
      if (msg.event === 'create' || msg.event === 'patch') {
        const { data } = await fn(
          msg.identifier,
          this.environment,
          this.cluster,
        );
        setFn(msg.identifier, data);
      } else if (msg.event === 'delete') {
        delFn(msg.identifier);
      }
    } catch (error) {
      this.log.error(
        'Error while fetching data with identifier:',
        msg.identifier,
        error,
      );
      throw error;
    }
    this.log.info('Processing message finished', msg);
    return;
  }

  connected(): boolean {
    return this.eventSource.readyState == StreamProcessor.CONNECTED;
  }

  stop(): void {
    this.log.info('Stopping StreamProcessor');
    this.eventSource.close();
    this.eventBus.emit(StreamEvent.DISCONNECTED);
  }

  close(): void {
    this.log.info('Closing StreamProcessor');
    this.stop();
    this.log.info('StreamProcessor closed');
  }
}
