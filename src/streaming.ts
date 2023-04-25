import EventEmitter from 'events';
import { AxiosPromise } from 'axios';
import { ClientApi, FeatureConfig, Segment } from './openapi';
import { StreamEvent, Options, StreamMsg } from './types';
import { Repository } from './repository';
import { ConsoleLog } from './log';

import https, { RequestOptions } from 'https';
import http from 'http';

type FetchFunction = (
  identifier: string,
  environment: string,
  cluster: string,
) => AxiosPromise<FeatureConfig | Segment>;

export class StreamProcessor {
  static readonly CONNECTED = 1;
  static readonly RETRYING = 2;
  static readonly SSE_TIMEOUT_MS = 30000;

  private apiKey: string;
  private jwtToken: string;
  private environment: string;
  private options: Options;
  private cluster: string;
  private eventBus: EventEmitter;
  private api: ClientApi;
  private readyState: number;
  private repository: Repository;
  private log: ConsoleLog;
  private retryDelayMs: number;
  private retryAttempt: number;

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

    const minDelay = 5000;
    const maxDelay = 10000;
    this.retryAttempt = 1;
    this.retryDelayMs = Math.floor(
      Math.random() * (maxDelay - minDelay + 1) + minDelay,
    );
  }

  start(): void {
    this.log.info('Starting new StreamProcessor');

    const url = `${this.options.baseUrl}/stream?cluster=${this.cluster}`;

    const options = {
      headers: {
        'Cache-Control': 'no-cache',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${this.jwtToken}`,
        'API-Key': this.apiKey,
      },
    };

    const connected = () => {
      this.log.info(`SSE stream connected OK: ${url}`);
      this.retryAttempt = 1;
      this.readyState = StreamProcessor.CONNECTED;
      this.eventBus.emit(StreamEvent.CONNECTED);
    };

    const failed = (msg) => {
      const delayMs = this.getRandomRetryDelayMs();
      this.log.warn(`SSE disconnected: ${msg} will retry in ${delayMs}ms`);
      this.readyState = StreamProcessor.RETRYING;
      this.eventBus.emit(StreamEvent.RETRYING);

      setTimeout(() => {
        this.log.info('SSE retrying to connect');
        this.connect(url, options, connected, failed);
      }, delayMs);
    };

    this.connect(url, options, connected, failed);

    this.eventBus.emit(StreamEvent.READY);
  }

  private getRandomRetryDelayMs(): number {
    const delayMs = this.retryDelayMs * this.retryAttempt;
    this.retryAttempt += 1;
    return Math.min(delayMs, 60000);
  }

  private connect(
    url: string,
    options: RequestOptions,
    connected,
    failed,
  ): void {
    if (this.readyState === StreamProcessor.CONNECTED) {
      this.log.debug('SSE already connected, skip retry');
      return;
    }

    const isSecure = url.startsWith('https:');
    this.log.debug('SSE HTTP start request', url);

    (isSecure ? https : http)
      .request(url, options, (res) => {
        this.log.debug('SSE got HTTP response code', res.statusCode);

        if (res.statusCode !== 200) {
          failed('HTTP code ' + res.statusCode);
          return;
        }

        connected();

        res
          .on('data', this.processData)
          .on('close', () => {
            failed('SSE stream closed');
          });
        //.on('end', ()=> { failed('SSE stream ended'); })
      })
      .on('error', (err) => {
        failed('SSE request failed ' + err.message);
      })
      .on('timeout', () => {
        failed(
          'SSE request timed out after ' +
            StreamProcessor.SSE_TIMEOUT_MS +
            'ms',
        );
      })
      .setTimeout(StreamProcessor.SSE_TIMEOUT_MS)
      .end();
  }

  private processData(data: any): void {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => this.processLine(line));
  }

  private processLine(line: string): void {
    if (line.startsWith('data:')) {
      this.log.debug('SSE GOT:', line.substring(5));
      const msg = JSON.parse(line.substring(5));

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
    }
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
    return this.readyState == StreamProcessor.CONNECTED;
  }

  stop(): void {
    this.log.info('Stopping StreamProcessor');
    this.eventBus.emit(StreamEvent.DISCONNECTED);
  }

  close(): void {
    this.log.info('Closing StreamProcessor');
    this.stop();
    this.log.info('StreamProcessor closed');
  }
}
