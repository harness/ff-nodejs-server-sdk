import * as events from 'events';
import {
  FEATURE_IDENTIFIER_ATTRIBUTE,
  FEATURE_NAME_ATTRIBUTE,
  GLOBAL_TARGET,
  SDK_LANGUAGE,
  SDK_LANGUAGE_ATTRIBUTE,
  SDK_TYPE,
  SDK_TYPE_ATTRIBUTE,
  SDK_VERSION_ATTRIBUTE,
  TARGET_ATTRIBUTE,
  VARIATION_IDENTIFIER_ATTRIBUTE,
} from './constants';
import {
  Configuration,
  FeatureConfig,
  KeyValue,
  Metrics,
  MetricsApi,
  MetricsData,
  MetricsDataMetricsTypeEnum,
  TargetData,
  Variation,
} from './openapi';
import { Options, Target } from './types';
import { VERSION } from './version';
import {
  infoMetricsSuccess,
  infoMetricsThreadExited,
  warnPostMetricsFailed,
} from './sdk_codes';
import { Logger } from './log';

export enum MetricEvent {
  READY = 'metrics_ready',
  ERROR = 'metrics_error',
}

interface AnalyticsEvent {
  target: Target;
  featureConfig: FeatureConfig;
  variation: Variation;
  count: number;
}

export interface MetricsProcessorInterface {
  start(): void;
  close(): void;
  enqueue(
    target: Target,
    featureConfig: FeatureConfig,
    variation: Variation,
  ): void;
}

export class MetricsProcessor implements MetricsProcessorInterface {
  private evaluationAnalytics: Map<string, AnalyticsEvent> = new Map();
  private targetAnalytics: Map<string, Target> = new Map();

  // Only store and send targets that haven't been sent before in the life of the client instance
  private seenTargets: Set<string> = new Set();
  private syncInterval?: NodeJS.Timeout;
  private api: MetricsApi;
  private readonly log: Logger;

  constructor(
    private environment: string,
    private cluster: string = '1',
    private conf: Configuration,
    private options: Options,
    private eventBus: events.EventEmitter,
    private closed: boolean = false,
  ) {
    const configuration = new Configuration({
      ...this.conf,
      basePath: options.eventsUrl,
    });

    this.api = new MetricsApi(configuration);
    this.log = options.logger;
  }

  start(): void {
    this.log.info(
      'Starting MetricsProcessor with request interval: ',
      this.options.eventsSyncInterval,
    );
    this.syncInterval = setInterval(
      () => this._send(),
      this.options.eventsSyncInterval,
    );
    this.eventBus.emit(MetricEvent.READY);
  }

  close(): void {
    this.log.info('Closing MetricsProcessor');
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this._send();
    this.closed = true;
    this.log.info('MetricsProcessor closed');
    infoMetricsThreadExited(this.log);
  }

  enqueue(
    target: Target,
    featureConfig: FeatureConfig,
    variation: Variation,
  ): void {
    const event: AnalyticsEvent = {
      target,
      featureConfig,
      variation,
      count: 0,
    };
    const key = this._formatKey(event);
    const found = this.evaluationAnalytics.get(key);
    if (found) {
      found.count++;
    } else {
      event.count = 1;
      this.evaluationAnalytics.set(key, event);
    }

    if (target && target.identifier) {
      // If target has been seen or is anonymous then ignore it
      if (this.seenTargets.has(target.identifier) || target.anonymous) {
        return;
      }

      this.seenTargets.add(target.identifier);
      this.targetAnalytics.set(target.identifier, target);
    }
  }

  private _formatKey(event: AnalyticsEvent): string {
    const feature = event.featureConfig.feature;
    const variation = event.variation.identifier;
    const value = event.variation.value;
    return `${feature}/${variation}/${value}/${GLOBAL_TARGET}`;
  }

  private _summarize(): Metrics | unknown {
    const targetData: TargetData[] = [];
    const metricsData: MetricsData[] = [];

    // clone map and clear data
    const clonedEvaluationAnalytics = new Map(this.evaluationAnalytics);
    const clonedTargetAnalytics = new Map(this.targetAnalytics);
    this.evaluationAnalytics.clear();
    this.targetAnalytics.clear();

    clonedEvaluationAnalytics.forEach((event) => {
      const metricsAttributes: KeyValue[] = [
        {
          key: FEATURE_IDENTIFIER_ATTRIBUTE,
          value: event.featureConfig.feature,
        },
        {
          key: VARIATION_IDENTIFIER_ATTRIBUTE,
          value: event.variation.identifier,
        },
        { key: FEATURE_NAME_ATTRIBUTE, value: event.featureConfig.feature },
        { key: SDK_TYPE_ATTRIBUTE, value: SDK_TYPE },
        { key: SDK_LANGUAGE_ATTRIBUTE, value: SDK_LANGUAGE },
        { key: SDK_VERSION_ATTRIBUTE, value: VERSION },
        { key: TARGET_ATTRIBUTE, value: event?.target?.identifier ?? null },
      ];

      const md: MetricsData = {
        timestamp: Date.now(),
        count: event.count,
        metricsType: MetricsDataMetricsTypeEnum.Ffmetrics,
        attributes: metricsAttributes,
      };
      metricsData.push(md);
    });

    clonedTargetAnalytics.forEach((target) => {
      let targetAttributes: KeyValue[] = [];
      if (target.attributes) {
        targetAttributes = Object.entries(target.attributes).map(
          ([key, value]) => {
            return { key, value: this.valueToString(value) };
          },
        );
      }

      let targetName = target.identifier;
      if (target.name) {
        targetName = target.name;
      }

      const td: TargetData = {
        identifier: target.identifier,
        name: targetName,
        attributes: targetAttributes,
      };
      targetData.push(td);
    });

    return {
      targetData: targetData,
      metricsData: metricsData,
    };
  }

  private async _send(): Promise<void> {
    if (this.closed) {
      this.log.debug('SDK has been closed before metrics can be sent');
      return;
    }

    if (this.evaluationAnalytics.size === 0) {
      this.log.debug('No metrics to send in this interval');
      return;
    }

    const metrics: Metrics = this._summarize();

    this.log.debug('Start sending metrics data');
    try {
      const response = await this.api.postMetrics(
        this.environment,
        this.cluster,
        metrics,
      );
      this.log.debug('Metrics server returns: ', response.status);
      infoMetricsSuccess(this.log);
      if (response.status >= 400) {
        this.log.error(
          'Error while sending metrics data with status code: ',
          response.status,
        );
      }
    } catch (error) {
      warnPostMetricsFailed(`${error}`, this.log);
      this.log.debug('Metrics server returns error: ', error);
    }
  }

  private valueToString(value: any): string {
    return typeof value === 'object' && !Array.isArray(value)
      ? JSON.stringify(value)
      : String(value);
  }
}
