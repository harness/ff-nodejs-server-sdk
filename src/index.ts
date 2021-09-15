import jwt_decode from 'jwt-decode';
import { Claims, Options, Target } from './types';
import { Configuration, DefaultApi } from './openapi';
import { VERSION } from './version';
import { PollingProcessor } from './polling';
import { StreamProcessor } from './streaming';
import * as events from 'events';
import { Evaluator } from './evaluator';
import { defaultOptions } from './constants';
import { Repository, StorageRepository } from './repository';

const log = defaultOptions.logger;
export class CfClient {
  private evaluator: Evaluator;
  private repository: Repository;
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

    this.repository = new StorageRepository(
      this.options.cache,
      this.options.store,
    );
    this.evaluator = new Evaluator(this.repository);

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
      this.repository,
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
        this.repository,
      );

      this.streamProcessor.start();
    }

    log.info('finished setting up processors');
  }

  boolVariation(
    identifier: string,
    target: Target,
    defaultValue = false,
  ): boolean {
    return this.evaluator.boolVariation(identifier, target, defaultValue);
  }

  stringVariation(
    identifier: string,
    target: Target,
    defaultValue = '',
  ): string {
    return this.evaluator.stringVariation(identifier, target, defaultValue);
  }

  numberVariation(
    identifier: string,
    target: Target,
    defaultValue = 0,
  ): number {
    return this.evaluator.numberVariation(identifier, target, defaultValue);
  }

  jsonVariation(
    identifier: string,
    target: Target,
    defaultValue = {},
  ): Record<string, unknown> {
    return this.evaluator.jsonVariation(identifier, target, defaultValue);
  }

  close(): void {
    this.pollProcessor.close();
    if (this.options.enableStream) {
      this.streamProcessor.close();
    }
  }
}
