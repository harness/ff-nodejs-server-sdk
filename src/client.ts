import EventEmitter from 'events';
import jwt_decode from 'jwt-decode';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import {
  APIConfiguration,
  Claims,
  Options,
  StreamEvent,
  Target,
} from './types';
import { Configuration, ClientApi, FeatureConfig, Variation } from './openapi';
import { VERSION } from './version';
import { PollerEvent, PollingProcessor } from './polling';
import { StreamProcessor } from './streaming';
import { Evaluator } from './evaluator';
import { apiConfiguration, defaultOptions } from './constants';
import { Repository, RepositoryEvent, StorageRepository } from './repository';
import {
  MetricEvent,
  MetricsProcessor,
  MetricsProcessorInterface,
} from './metrics';
import { Logger } from './log';
import {
  infoMetricsThreadStarted,
  infoPollStarted,
  infoSDKCloseSuccess,
  infoSDKInitOK,
  infoSDKStartClose,
  infoStreamConnected,
  warnAuthFailedSrvDefaults,
  warnDefaultVariationServed,
  warnFailedInitAuthError,
  warnMissingSDKKey,
} from './sdk_codes';
import https from 'https';
import * as fs from 'fs';

enum Processor {
  POLL,
  STREAM,
  METRICS,
}

export enum Event {
  READY = 'ready',
  FAILED = 'failed',
  CHANGED = 'changed',
}

export const SDK_INFO = `NodeJS ${VERSION} Server`;

export default class Client {
  private evaluator: Evaluator;
  private repository: Repository;
  private api: ClientApi;
  private sdkKey: string;
  private log: Logger;
  private authToken: string;
  private environment: string;
  private configuration: Configuration;
  private options: Options;
  private apiConfiguration: APIConfiguration = apiConfiguration;
  private cluster = '1';
  private eventBus = new EventEmitter();
  private pollProcessor: PollingProcessor;
  private streamProcessor: StreamProcessor;
  private metricsProcessor: MetricsProcessorInterface;
  private initialized = false;
  private failure = false;
  private waitForInitializePromise: Promise<Client>;
  private pollerReady = false;
  private streamReady = false;
  private metricReady = false;
  private closing = false;
  private httpsClient: AxiosInstance;
  private httpsCa: Buffer;

  constructor(sdkKey: string, options: Options = {}) {
    this.sdkKey = sdkKey;
    this.options = { ...defaultOptions, ...options };
    this.log = this.options.logger;

    if (options.pollInterval < defaultOptions.pollInterval) {
      this.options.pollInterval = defaultOptions.pollInterval;
      this.log.warn(
        `Polling interval cannot be lower than ${defaultOptions.pollInterval} ms`,
      );
    }

    if (options.eventsSyncInterval < defaultOptions.eventsSyncInterval) {
      this.options.eventsSyncInterval = defaultOptions.eventsSyncInterval;
      this.log.warn(
        `Events sync interval cannot be lower than ${defaultOptions.eventsSyncInterval} ms`,
      );
    }

    this.configuration = new Configuration({
      basePath: this.options.baseUrl,
      baseOptions: {
        headers: {
          'User-Agent': `NodeJsSDK/${VERSION}`,
          'Harness-SDK-Info': SDK_INFO,
        },
      },
    });

    this.repository = new StorageRepository(
      this.options.cache,
      this.options.store,
      this.eventBus,
    );
    this.evaluator = new Evaluator(this.repository, this.log);

    // Setup https client for sass or on-prem connections
    this.httpsClient = this.createAxiosInstanceWithRetries(this.options);
    this.api = new ClientApi(
      this.configuration,
      this.options.baseUrl,
      this.httpsClient,
    );

    this.processEvents();
    this.run();
  }

  private processEvents(): void {
    this.eventBus.on(PollerEvent.READY, () => {
      this.initialize(Processor.POLL);
    });

    this.eventBus.on(PollerEvent.ERROR, () => {
      this.failure = true;
      this.eventBus.emit(Event.FAILED);
    });

    this.eventBus.on(StreamEvent.READY, () => {
      this.initialize(Processor.STREAM);
    });

    // Track the last time we logged a streaming retry message to avoid log spam
    let lastStreamRetryLogTime = 0;
    // Only log the stream retry message once every 5 minutes
    const STREAM_RETRY_LOG_THROTTLE_MS = 5 * 60 * 1000;
    
    this.eventBus.on(StreamEvent.RETRYING, () => {
      this.failure = true;
      
      // Check if we should log the error message based on time since last log
      const now = Date.now();
      if (now - lastStreamRetryLogTime >= STREAM_RETRY_LOG_THROTTLE_MS) {
        this.log.error(
          'Issue with streaming: falling back to polling while the SDK attempts to reconnect',
        );
        lastStreamRetryLogTime = now;
      }

      if (!this.closing) {
        this.pollProcessor.start();
      }
    });

    this.eventBus.on(StreamEvent.ERROR, () => {
      this.failure = true;
      this.log.error(
        'Unrecoverable issue with streaming: falling back to polling',
      );

      if (!this.closing) {
        this.pollProcessor.start();
      }

      this.eventBus.emit(Event.FAILED);
    });

    this.eventBus.on(MetricEvent.READY, () => {
      this.initialize(Processor.METRICS);
    });

    this.eventBus.on(MetricEvent.ERROR, () => {
      this.failure = true;
      this.eventBus.emit(Event.FAILED);
    });

    this.eventBus.on(StreamEvent.CONNECTED, () => {
      this.pollProcessor.stop();
    });

    this.eventBus.on(StreamEvent.DISCONNECTED, () => {
      if (!this.closing) {
        this.pollProcessor.start();
      }
    });

    for (const event of Object.values(RepositoryEvent)) {
      this.eventBus.on(event, (identifier) => {
        switch (event) {
          case RepositoryEvent.FLAG_STORED:
          case RepositoryEvent.FLAG_DELETED:
            this.eventBus.emit(Event.CHANGED, identifier);
            break;
          case RepositoryEvent.SEGMENT_STORED:
          case RepositoryEvent.SEGMENT_DELETED:
            // find all flags where segment match and emit the event
            this.repository
              .findFlagsBySegment(identifier)
              .then((values: string[]) => {
                values.forEach((value) =>
                  this.eventBus.emit(Event.CHANGED, value),
                );
              });
            break;
        }
      });
    }
  }

  on(event: Event, callback: (...args: unknown[]) => void): void {
    const arrayObjects = [];

    for (const value of Object.values(Event)) {
      arrayObjects.push(value);
    }

    if (arrayObjects.includes(event)) {
      this.eventBus.on(event, callback);
    }
  }

  off(event?: string, callback?: () => void): void {
    if (event) {
      this.eventBus.off(event, callback);
    } else {
      this.close();
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.sdkKey) {
      warnMissingSDKKey(this.log);
      this.failure = true;
      return;
    }

    try {
      const response = await this.api.authenticate({
        apiKey: this.sdkKey,
      });
      this.authToken = response.data.authToken;
      this.configuration.accessToken = this.authToken;

      const decoded: Claims = jwt_decode(this.authToken);

      if (!decoded.environment) {
        this.failure = true;
        this.log.error(
          'Error while authenticating, err:  the JWT token has missing claim "environmentUUID" ',
        );
      }

      if (decoded.accountID) {
        this.configuration.baseOptions.headers['Harness-AccountID'] =
          decoded.accountID;
      }

      if (decoded.environmentIdentifier) {
        this.configuration.baseOptions.headers['Harness-EnvironmentID'] =
          decoded.environmentIdentifier;
      }

      this.environment = decoded.environment;
      this.cluster = decoded.clusterIdentifier || '1';
    } catch (error) {
      this.failure = true;
      this.log.error('Error while authenticating, err: ', error);
      warnAuthFailedSrvDefaults(this.log);
      warnFailedInitAuthError(this.log);
      this.eventBus.emit(Event.FAILED, error);
    }
  }

  waitForInitialization(): Promise<Client> {
    if (!this.waitForInitializePromise) {
      if (this.initialized) {
        this.waitForInitializePromise = Promise.resolve(this);
        infoSDKInitOK(this.log);
      } else if (!this.initialized && this.failure) {
        // We unblock the call even if initialization has failed. We've
        // already warned the user that initialization has failed with the reason and that
        // defaults will be served
        this.waitForInitializePromise = Promise.resolve(this);
      } else {
        this.waitForInitializePromise = new Promise((resolve, reject) => {
          this.eventBus.once(Event.READY, () => {
            setTimeout(() => resolve(this), 0);
          });
          this.eventBus.once(Event.FAILED, reject);
        });
      }
    }

    return this.waitForInitializePromise;
  }

  private createAxiosInstanceWithRetries(options: Options): AxiosInstance {
    let axiosConfig: AxiosRequestConfig = {
      timeout: options.axiosTimeout,
    };

    if (options.tlsTrustedCa) {
      const httpsCa = fs.readFileSync(options.tlsTrustedCa);
      // Set axiosConfig with httpsAgent when TLS config is provided
      axiosConfig = {
        ...axiosConfig,
        httpsAgent: new https.Agent({
          ca: httpsCa,
        }),
      };
    }

    const instance: AxiosInstance = axios.create(axiosConfig);
    axiosRetry(instance, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
    });
    return instance;
  }

  private initialize(processor: Processor): void {
    switch (processor) {
      case Processor.POLL:
        this.pollerReady = true;
        this.log.debug('PollingProcessor ready');
        infoPollStarted(this.options.pollInterval, this.log);
        break;
      case Processor.STREAM:
        this.streamReady = true;
        this.log.debug('StreamingProcessor ready');
        infoStreamConnected(this.log);
        break;
      case Processor.METRICS:
        this.metricReady = true;
        this.log.debug('MetricsProcessor ready');
        infoMetricsThreadStarted(this.options.eventsSyncInterval, this.log);
        break;
    }

    if (this.options.enableStream && !this.streamReady) {
      return;
    }

    if (this.options.enableAnalytics && !this.metricReady) {
      return;
    }

    if (!this.pollerReady) {
      return;
    }

    this.eventBus.emit(Event.READY);
  }

  private async run(): Promise<void> {
    await this.authenticate();

    // If authentication has failed then we don't want to continue. We have already warned
    // the user that authentication has failed, and that the SDK will serve defaults.
    if (this.failure) {
      return;
    }

    this.pollProcessor = new PollingProcessor(
      this.environment,
      this.cluster,
      this.api,
      this.apiConfiguration,
      this.options,
      this.eventBus,
      this.repository,
    );

    this.pollProcessor.start();

    if (this.options.enableStream) {
      this.streamProcessor = new StreamProcessor(
        this.api,
        this.sdkKey,
        apiConfiguration,
        this.environment,
        this.authToken,
        this.options,
        this.cluster,
        this.eventBus,
        this.repository,
        this.configuration.baseOptions.headers,
        this.httpsCa,
      );

      this.streamProcessor.start();
    }

    if (this.options.enableAnalytics) {
      this.metricsProcessor = new MetricsProcessor(
        this.environment,
        this.cluster,
        this.configuration,
        this.options,
        this.eventBus,
        false,
        this.httpsClient,
      );
      this.metricsProcessor.start();
    }

    this.log.info('finished setting up processors');
    this.initialized = true;
    infoSDKInitOK(this.log);
  }

  boolVariation(
    identifier: string,
    target?: Target,
    defaultValue = false,
  ): Promise<boolean> {
    if (!this.initialized) {
      warnDefaultVariationServed(
        identifier,
        target,
        defaultValue.toString(),
        this.log,
      );

      return Promise.resolve(defaultValue);
    }

    return this.evaluator.boolVariation(
      identifier,
      target,
      defaultValue,
      (fc: FeatureConfig, target: Target, variation: Variation) => {
        if (this.metricsProcessor) {
          this.metricsProcessor.enqueue(target, fc, variation);
        }
      },
    );
  }

  stringVariation(
    identifier: string,
    target?: Target,
    defaultValue = '',
  ): Promise<string> {
    if (!this.initialized) {
      warnDefaultVariationServed(
        identifier,
        target,
        defaultValue.toString(),
        this.log,
      );

      return Promise.resolve(defaultValue);
    }

    return this.evaluator.stringVariation(
      identifier,
      target,
      defaultValue,
      (fc: FeatureConfig, target: Target, variation: Variation) => {
        if (this.metricsProcessor) {
          this.metricsProcessor.enqueue(target, fc, variation);
        }
      },
    );
  }

  numberVariation(
    identifier: string,
    target?: Target,
    defaultValue = 0,
  ): Promise<number> {
    if (!this.initialized) {
      warnDefaultVariationServed(
        identifier,
        target,
        defaultValue.toString(),
        this.log,
      );

      return Promise.resolve(defaultValue);
    }

    return this.evaluator.numberVariation(
      identifier,
      target,
      defaultValue,
      (fc: FeatureConfig, target: Target, variation: Variation) => {
        if (this.metricsProcessor) {
          this.metricsProcessor.enqueue(target, fc, variation);
        }
      },
    );
  }

  jsonVariation(
    identifier: string,
    target?: Target,
    defaultValue = {},
  ): Promise<Record<string, unknown>> {
    if (!this.initialized) {
      warnDefaultVariationServed(
        identifier,
        target,
        defaultValue.toString(),
        this.log,
      );

      return Promise.resolve(defaultValue);
    }

    return this.evaluator.jsonVariation(
      identifier,
      target,
      defaultValue,
      (fc: FeatureConfig, target: Target, variation: Variation) => {
        if (this.metricsProcessor) {
          this.metricsProcessor.enqueue(target, fc, variation);
        }
      },
    );
  }

  close(): void {
    infoSDKStartClose(this.log);
    this.closing = true;
    this.pollProcessor.close();

    if (this.streamProcessor) {
      this.streamProcessor.close();
    }

    if (this.metricsProcessor) {
      this.metricsProcessor.close();
    }

    this.eventBus.removeAllListeners();
    this.closing = false;
    infoSDKCloseSuccess(this.log);
  }
}
