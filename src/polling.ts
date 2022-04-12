import { ClientApi, FeatureConfig, Segment } from './openapi';
import { Options } from './types';
import EventEmitter from 'events';
import { Repository } from './repository';
import { defaultOptions } from './constants';

const log = defaultOptions.logger;

export enum PollerEvent {
  READY = 'poller_ready',
  ERROR = 'poller_error',
}

export class PollingProcessor {
  private environment: string;
  private cluster: string;
  private api: ClientApi;
  private stopped = true;
  private options: Options;
  private repository: Repository;
  private initialized = false;
  private eventBus: EventEmitter;
  private timeout: NodeJS.Timeout;

  constructor(
    environment: string,
    cluster: string,
    api: ClientApi,
    options: Options,
    eventBus: EventEmitter,
    repository: Repository,
  ) {
    this.api = api;
    this.options = options;
    this.environment = environment;
    this.cluster = cluster;
    this.repository = repository;
    this.eventBus = eventBus;
  }

  private poll() {
    if (this.stopped) {
      log.info('PollingProcessor stopped');
      return;
    }

    const startTime = new Date().getTime();
    const pollAgain = () => {
      const elapsed = new Date().getTime() - startTime;
      const sleepFor = Math.max(this.options.pollInterval - elapsed, 0);

      this.timeout = setTimeout(() => this.poll(), sleepFor);
    };

    Promise.all([this.retrieveFlags(), this.retrieveSegments()])
      .then(() => {
        // when first fetch is successful then poller is ready
        if (!this.initialized) {
          this.initialized = true;
          this.eventBus.emit(PollerEvent.READY);
        }
      })
      .catch((error) => {
        this.eventBus.emit(PollerEvent.ERROR, { error });
      })
      .finally(() => {
        // we will check one more time if processor is stopped
        if (this.stopped) {
          log.info('PollingProcessor stopped');
          return;
        }
        pollAgain();
      });
  }

  private async retrieveFlags(): Promise<void> {
    try {
      log.debug('Fetching flags started');
      const response = await this.api.getFeatureConfig(
        this.environment,
        this.cluster,
      );
      log.debug('Fetching flags finished');
      response.data.forEach((fc: FeatureConfig) =>
        this.repository.setFlag(fc.feature, fc),
      );
    } catch (error) {
      log.error('Error loading flags', error);
      throw error;
    }
  }

  private async retrieveSegments(): Promise<void> {
    try {
      log.debug('Fetching segments started');
      const response = await this.api.getAllSegments(
        this.environment,
        this.cluster,
      );
      log.debug('Fetching segments finished');
      // prepare cache for storing segments
      response.data.forEach((segment: Segment) =>
        this.repository.setSegment(segment.identifier, segment),
      );
    } catch (error) {
      log.error('Error loading segments', error);
      throw error;
    }
  }

  start(): void {
    if (!this.stopped) {
      log.info('PollingProcessor already started');
      return;
    }
    log.info(
      'Starting PollingProcessor with request interval: ',
      this.options.pollInterval,
    );
    this.stopped = false;
    this.poll();
  }

  stop(): void {
    log.info('Stopping PollingProcessor');
    this.stopped = true;
  }

  close(): void {
    log.info('Closing PollingProcessor');
    this.stop();
    clearTimeout(this.timeout);
    log.info('PollingProcessor closed');
  }
}
