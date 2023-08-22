import { ClientApi, FeatureConfig, Segment } from './openapi';
import { Options } from './types';
import EventEmitter from 'events';
import { Repository } from './repository';
import { ConsoleLog } from './log';
import { infoPollingStopped } from './sdk_codes';

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
  private log: ConsoleLog;
  private lastPollTime = 0;

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
    this.log = options.logger;
  }

  private poll() {
    if (this.stopped) {
      this.log.info('PollingProcessor stopped');
      infoPollingStopped(this.log);
      return;
    }

    const startTime = new Date().getTime();
    const pollAgain = () => {
      const elapsed = new Date().getTime() - startTime;
      const sleepFor = Math.max(this.options.pollInterval - elapsed, 0);

      this.timeout = setTimeout(() => this.poll(), sleepFor);
    };

    if (this.lastPollTime > Date.now() - this.options.pollInterval) {
      this.log.info(
        `Last poll was ${Math.round(
          (Date.now() - this.lastPollTime) / 1000,
        )} seconds ago, skipping flag refresh`,
      );
      pollAgain();
      return;
    }

    this.lastPollTime = Date.now();
    Promise.all([this.retrieveFlags(), this.retrieveSegments()])
      .then(() => {
        // when first fetch is successful then poller is ready
        if (!this.initialized) {
          setTimeout(() => {
            this.initialized = true;
            this.eventBus.emit(PollerEvent.READY);
          }, 0);
        }
      })
      .catch((error) => {
        this.eventBus.emit(PollerEvent.ERROR, { error });
      })
      .finally(() => {
        // we will check one more time if processor is stopped
        if (this.stopped) {
          this.log.info('PollingProcessor stopped');
          infoPollingStopped(this.log);
          return;
        }
        pollAgain();
      });
  }

  private async retrieveFlags(retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        this.log.debug('Fetching flags');

        const response = await this.api.getFeatureConfig(
          this.environment,
          this.cluster,
        );

        this.log.debug('Fetching flags finished');
        response.data.forEach((fc: FeatureConfig) =>
          this.repository.setFlag(fc.feature, fc),
        );

        return;
      } catch (error) {
        this.log.debug(
          `Fetching flags attempt ${i + 1} of ${retries} failed.`,
        );

        if (i === retries - 1) {
          this.log.error('Error loading flags and retries exceeded', error);

          // Let error bubble up
          throw error;
        }
      }
    }
  }


  private async retrieveSegments(retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        this.log.debug('Fetching segments');
        const response = await this.api.getAllSegments(
          this.environment,
          this.cluster,
        );
        this.log.debug('Fetching segments finished');
        response.data.forEach((segment: Segment) =>
          this.repository.setSegment(segment.identifier, segment),
        );
        return;
      } catch (error) {
        this.log.debug(
          `Fetching segments attempt ${i + 1} of ${retries} failed.`,
        );
        if (i === retries - 1) {
          this.log.error('Error loading segments and retries exceeded', error);
          // Let error bubble up
          throw error;
        }
      }
    }
  }


  start(): void {
    if (!this.stopped) {
      this.log.info('PollingProcessor already started');
      return;
    }
    this.log.info(
      'Starting PollingProcessor with request interval: ',
      this.options.pollInterval,
    );
    this.stopped = false;
    this.poll();
  }

  stop(): void {
    this.log.info('Stopping PollingProcessor');
    this.stopped = true;
  }

  close(): void {
    this.log.info('Closing PollingProcessor');
    this.stop();
    clearTimeout(this.timeout);
    this.log.info('PollingProcessor closed');
  }
}
