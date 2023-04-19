import EventEmitter from 'events';
import { AxiosPromise } from 'axios';
import { ClientApi, FeatureConfig, Segment } from './openapi';
import { StreamEvent, Options, StreamMsg } from './types';
import { Repository } from './repository';
import { ConsoleLog } from './log';

import * as https from 'https';
import * as http from 'http';
import {RequestOptions} from "https";

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
  private readyState: number;
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
    this.log.info('Starting new StreamProcessor');

    const url = new URL(this.options.baseUrl);
    const options = {
      host: url.hostname,
      port: url.port,
      path: `${url.pathname}/stream?cluster=${this.cluster}`,
      headers : {
        "Cache-Control": "no-cache",
        "Accept": "text/event-stream",
        "Authorization": `Bearer ${this.jwtToken}`,
        "API-Key": this.apiKey,
      }
    }

    this.connect(options)
      .then(() => console.log("SSE connected"))
      .catch((msg) => console.log("SSE disconnected: " + msg)) // TODO add retry logic here

    this.readyState = StreamProcessor.CONNECTED;
    this.eventBus.emit(StreamEvent.READY);
  }

  private async connect(options: RequestOptions): Promise<boolean> {
    const timeout = 30000
    const isSecure = options.path.startsWith("https:");
    this.log.info('SSE HTTP request ', options.path);

    return new Promise((resolve, reject) => {

      (isSecure ? https : http).request(options, (res) => {
        this.log.info('SSE HTTP response code ', res.statusCode);

        if (res.statusCode >= 400 && res.statusCode <= 599) {
          reject("HTTP code " + res.statusCode);
          return;
        }

        //resolve(true);
        this.eventBus.emit(StreamEvent.CONNECTED);

        res.on('data', (data) => { this.processData(data); })
          .on('close', () => { reject('SSE stream closed'); })
          .on('end', ()=> { reject('SSE stream ended'); })

      }).on('error', (err) => { reject( "SSE request failed " + err.message) })
        .on('timeout',  () => { reject( "SSE request timed out after " + timeout + "ms") })
        .setTimeout(timeout)
        .end();
   });

  }

  private processData(data: any): void {
    const str = data.toString();
    const pos = str.indexOf("{"); // TODO only parse full lines
    if (pos != -1) {
      console.log('SSE GOT: ', str.substring(pos));
      const msg = JSON.parse(str.substring(pos));
      if (msg.domain === 'flag') {
        console.log('SSE FLAG UPDATE ');
        this.msgProcessor(
          msg,
          this.api.getFeatureConfigByIdentifier.bind(this.api),
          this.repository.setFlag.bind(this.repository),
          this.repository.deleteFlag.bind(this.repository),
        );
      } else if (msg.domain === 'target-segment') {
        console.log('SSE TARGET-SEGMENT UPDATE ');
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
