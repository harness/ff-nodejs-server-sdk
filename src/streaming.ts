import EventEmitter from 'events';
import { AxiosPromise } from 'axios';
import { ClientApi, FeatureConfig, Segment } from './openapi';
import { StreamEvent, Options, StreamMsg, APIConfiguration } from './types';
import { Repository } from './repository';
import { ConsoleLog } from './log';

import https, { RequestOptions } from 'https';
import http, { ClientRequest } from 'http';
import {
  debugStreamEventReceived,
  infoStreamStopped,
  warnStreamDisconnected,
  warnStreamRetrying,
} from './sdk_codes';

type FetchFunction = (
  identifier: string,
  environment: string,
  cluster: string,
  // Only target-segment requests require this, and it will be safely ignored for feature calls.
  targetSegmentRulesQueryParameter: string,
) => AxiosPromise<FeatureConfig | Segment>;

export class StreamProcessor {
  static readonly CONNECTED = 1;
  static readonly RETRYING = 2;
  static readonly CLOSED = 3;
  static readonly SSE_TIMEOUT_MS = 30000;

  private readonly apiKey: string;
  private readonly jwtToken: string;
  private readonly environment: string;
  private readonly cluster: string;
  private readonly api: ClientApi;
  private readonly apiConfiguration: APIConfiguration;
  private readonly repository: Repository;
  private readonly retryDelayMs: number;
  private readonly headers: Record<string, string>;
  private readonly httpsCa: Buffer;

  private options: Options;
  private request: ClientRequest;
  private eventBus: EventEmitter;
  private readyState: number;
  private log: ConsoleLog;
  private retryAttempt = 0;

  constructor(
    api: ClientApi,
    apiKey: string,
    apiConfiguration: APIConfiguration,
    environment: string,
    jwtToken: string,
    options: Options,
    cluster: string,
    eventBus: EventEmitter,
    repository: Repository,
    headers: Record<string, string>,
    httpsCa: Buffer,
  ) {
    this.api = api;
    this.apiKey = apiKey;
    this.apiConfiguration = apiConfiguration;
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
    this.headers = headers;
    this.httpsCa = httpsCa;
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
        ...this.headers,
      },
      ca: undefined,
    };

    if (this.httpsCa) {
      options.ca = this.httpsCa;
    }

    // Track connection patterns to detect unstable connections
    let lastLoggedConnectionTime = 0;
    let reconnectionCount = 0;
    const CONNECTION_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

    const onConnected = () => {
      const now = Date.now();
      
      // Determine if this is initial connection or a reconnection
      if (lastLoggedConnectionTime === 0) {
        // This is the initial connection after startup - always log it
        this.log.info(`SSE stream connected OK: ${url}`);
        lastLoggedConnectionTime = now;
        // Reset reconnection counter since this is the first connection
        reconnectionCount = 0;
      } else {
        // This is a reconnection
        reconnectionCount++;
        
        // Only log reconnection if it's been a while since our last logged connection
        if (now - lastLoggedConnectionTime >= CONNECTION_THROTTLE_MS) {
          // Log the reconnection with count information
          this.log.warn(`SSE stream connected OK: ${url} (reconnected ${reconnectionCount} times in the last ${Math.floor((now - lastLoggedConnectionTime)/1000)} seconds)`);
          
          // Reset the counter and update last logged time
          lastLoggedConnectionTime = now;
          reconnectionCount = 0;
        } else {
          // Silently log reconnection to reduce spam during unstable periods
          this.log.debug(`SSE stream reconnected OK: ${url} (silent, reducing log spam)`);
        }
      }

      this.retryAttempt = 0;
      this.readyState = StreamProcessor.CONNECTED;
      this.eventBus.emit(StreamEvent.CONNECTED);
    };

    const onFailed = (msg: string) => {
      if (this.readyState !== StreamProcessor.CLOSED) {
        this.retryAttempt += 1;

        const delayMs = this.getRandomRetryDelayMs();
        warnStreamDisconnected(msg, this.log);
        warnStreamRetrying(delayMs, this.log);
        this.readyState = StreamProcessor.RETRYING;
        this.eventBus.emit(StreamEvent.RETRYING);

        setTimeout(() => {
          this.connect(url, options, onConnected, onFailed);
        }, delayMs);
      }
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

    const isSecure = url.startsWith('https:');
    this.log.debug('SSE HTTP start request', url);

    this.request = (isSecure ? https : http)
      .request(url, options, (res) => {
        this.log.debug('SSE got HTTP response code', res.statusCode);

        if (res.statusCode >= 400 && res.statusCode <= 599) {
          onFailed(`HTTP code ${res.statusCode}`);
          return;
        }

        onConnected();

        res
          .on('data', (data) => {
            this.processData(data);
          })
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
      .setTimeout(StreamProcessor.SSE_TIMEOUT_MS);
    this.request.end();
  }

  private processData(data: any): void {
    const lines = data.toString().split(/\r?\n/);
    if (lines[0].startsWith(':')) {
      this.log.debug('SSE Heartbeat received');
      return;
    }
    lines.forEach((line) => this.processLine(line));
  }

  private processLine(line: string): void {
    if (line.startsWith('data:')) {
      debugStreamEventReceived(this.log);
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
          this.apiConfiguration.targetSegmentRulesQueryParameter,
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
    if (this.readyState === StreamProcessor.CLOSED) {
      this.log.info('SteamProcessor already closed');
      return;
    }

    this.readyState = StreamProcessor.CLOSED;
    this.log.info('Closing StreamProcessor');

    this.request.destroy();
    this.request = undefined;

    this.eventBus.emit(StreamEvent.DISCONNECTED);
    this.log.info('StreamProcessor closed');
    infoStreamStopped(this.log);
  }
}
