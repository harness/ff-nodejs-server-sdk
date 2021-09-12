import jwt_decode from 'jwt-decode';
import { Claims, defaultOptions, Options } from './types';
import { Configuration, DefaultApi, Target } from './openapi';
import { log } from './utils';
import { VERSION } from './version';
import { PollingProcessor } from './polling';
import { StreamProcessor } from './streaming';
import * as events from 'events';

export class CfClient {
  private api: DefaultApi;
  private sdkKey: string;
  private authToken: string;
  private environment: string;
  private configuration: Configuration;
  private options: Options;
  private cluster = '1';
  private eventBus = new events.EventEmitter();
  private pollProcessor: PollingProcessor;
  private streamProcessor: StreamProcessor;

  constructor(sdkKey: string, options: Options = {}) {
    this.sdkKey = sdkKey;
    this.options = { ...defaultOptions, ...options };

    this.configuration = new Configuration({
      basePath: this.options.baseUrl,
    });

    this.api = new DefaultApi(this.configuration);
    this.run();
  }

  private async authenticate(): Promise<string> {
    const response = await this.api.authenticate({
      apiKey: this.sdkKey,
    });
    this.authToken = response.data.authToken;
    this.configuration.accessToken = this.authToken;

    const decoded: Claims = jwt_decode(this.authToken);

    this.environment = decoded.environment;
    this.cluster = decoded.clusterIdentifier || '1';
    this.configuration.baseOptions = {
      headers: {
        'User-Agent': `NodeJsSDK/${VERSION}`,
      },
    };
    return this.authToken;
  }

  async run(): Promise<void> {
    await this.authenticate();
    this.pollProcessor = new PollingProcessor(
      this.environment,
      this.cluster,
      this.api,
      this.options,
      this.eventBus,
    );

    // start processors
    this.pollProcessor.start();
    if (this.options.enableStream) {
      this.streamProcessor = new StreamProcessor(
        this.api,
        this.sdkKey,
        this.environment,
        this.authToken,
        this.options,
        this.cluster,
        this.eventBus,
      );

      this.streamProcessor.start();
    }

    log.info('finished setting up processors');
  }

  boolVariation(
    identifier: string,
    target: Target,
    defaultValue: false,
  ): boolean {
    console.log(identifier, target);
    return defaultValue;
  }

  close(): void {
    this.pollProcessor.close();
    if (this.options.enableStream) {
      this.streamProcessor.close();
    }
  }
}