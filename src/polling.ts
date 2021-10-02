import { AxiosResponse } from 'axios';
import { ClientApi, FeatureConfig, Segment } from './openapi';
import { Event, Options } from './types';
import EventEmitter from 'events';
import { Repository } from './repository';
import { defaultOptions } from './constants';

const log = defaultOptions.logger;

export class PollingProcessor {
  private environment: string;
  private cluster: string;
  private api: ClientApi;
  private stopped = true;
  private options: Options;
  private repository: Repository;

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

    // register listener for stream events
    eventBus.on(Event.CONNECTED, () => {
      this.stop();
    });

    eventBus.on(Event.DISCONNECTED, () => {
      this.start();
    });
  }

  private poll() {
    if (this.stopped) {
      return;
    }

    const startTime = new Date().getTime();
    const pollAgain = () => {
      const elapsed = new Date().getTime() - startTime;
      const sleepFor = Math.max(this.options.pollInterval - elapsed, 0);

      setTimeout(() => this.poll(), sleepFor);
    };

    Promise.all([this.retrieveFlags(), this.retrieveSegments()])
      .catch((error) => {
        log.error(error);
      })
      .finally(pollAgain);
  }

  private async retrieveFlags(): Promise<void | AxiosResponse<
    FeatureConfig[]
  >> {
    try {
      log.debug('Fetching flags started');
      const response = await this.api.getFeatureConfig(this.environment, {
        params: {
          cluster: this.cluster,
        },
      });
      log.debug('Fetching flags finished');
      response.data.forEach((fc: FeatureConfig) =>
        this.repository.setFlag(fc.feature, fc),
      );
    } catch (error) {
      log.error('Error loading flags', error);
      throw error;
    }
  }

  private async retrieveSegments(): Promise<void | AxiosResponse<Segment[]>> {
    try {
      log.debug('Fetching segments started');
      const response = await this.api.getAllSegments(this.environment, {
        params: {
          cluster: this.cluster,
        },
      });
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

  private stop(): void {
    log.info('Stopping PollingProcessor');
    this.stopped = true;
  }

  close(): void {
    log.info('Closing PollingProcessor');
    this.stop();
  }
}
