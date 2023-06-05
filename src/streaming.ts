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

  private readonly apiKey: string;
  private readonly jwtToken: string;
  private readonly environment: string;
  private readonly cluster: string;
  private readonly api: ClientApi;
  private readonly repository: Repository;
  private readonly retryDelayMs: number;

  private options: Options;
  private abortController: AbortController;
  private eventBus: EventEmitter;
  private readyState: number;
  private log: ConsoleLog;
  private retryAttempt = 0;

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
    this.retryDelayMs = Math.floor(
      Math.random() * (maxDelay - minDelay) + minDelay,
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
      // signal: { signal }
    };

    const onConnected = () => {
      this.log.info(`SSE stream connected OK: ${url}`);
      this.retryAttempt = 0;
      this.readyState = StreamProcessor.CONNECTED;
      this.eventBus.emit(StreamEvent.CONNECTED);
    };

    const onFailed = (msg: string) => {
      this.retryAttempt += 1;

      const delayMs = this.getRandomRetryDelayMs();
      this.log.warn(`SSE disconnected: ${msg} will retry in ${delayMs}ms`);
      this.readyState = StreamProcessor.RETRYING;
      this.eventBus.emit(StreamEvent.RETRYING);

      setTimeout(() => {
        this.log.info('SSE retrying to connect');
        this.connect(url, options, onConnected, onFailed);
      }, delayMs);
    };

    this.connect(url, options, onConnected, onFailed);

    this.eventBus.emit(StreamEvent.READY);
  }

  private getRandomRetryDelayMs(): number {
    const delayMs = this.retryDelayMs * this.retryAttempt;
    return Math.min(delayMs, 60000);
  }

  private connect(
    url: string,
    options: RequestOptions,
    onConnected: () => void,
    onFailed: (msg: string) => void,
  ): void {
    if (this.readyState === StreamProcessor.CONNECTED) {
      this.log.debug('SSE already connected, skip retry');
      return;
    }
    // Cleanup the previous AbortController instance if it exists
    if (this.abortController) {
      this.abortController.abort();
    }
    const abortController = new AbortController();
    const { signal } = abortController;

    const isSecure = url.startsWith('https:');
    this.log.debug('SSE HTTP start request', url);

    const newObject = { ...options, signal };

    (isSecure ? https : http)
      .request(url, newObject, (res) => {
        this.log.debug('SSE got HTTP response code', res.statusCode);

        if (res.statusCode >= 400 && res.statusCode <= 599) {
          onFailed(`HTTP code ${res.statusCode}`);
          return;
        }

        onConnected();

        res
          .on('data', (data) => this.processData(data))
          .on('close', () => {
            onFailed('SSE stream closed');
          });
      })
      .on('error', (err) => {
        onFailed('SSE request failed ' + err.message);
      })
      .on('timeout', () => {
        onFailed(
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
    return this.readyState === StreamProcessor.CONNECTED;
  }


  close(): void {
    if (this.readyState == StreamProcessor.CONNECTED || this.readyState == StreamProcessor.RETRYING) {
      this.log.info('Closing StreamProcessor');
      this.abortController.abort()
      this.eventBus.emit(StreamEvent.DISCONNECTED);
      this.log.info('StreamProcessor closed');
    }
    else {
      this.log.info('SteamProcessor already closed');
    }



  }
}
