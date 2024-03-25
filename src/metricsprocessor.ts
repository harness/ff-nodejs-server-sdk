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
  Metrics,
  MetricsApi,
  Variation,
  TargetData,
  KeyValue,
  MetricsData,
  MetricsDataMetricsTypeEnum,
} from './openapi';
import { Options, Target } from './types';
import { VERSION } from './version';
import {
  infoMetricsSuccess,
  infoMetricsThreadExited,
  warnPostMetricsFailed,
} from './sdk_codes';

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
  enqueue(target: Target, featureConfig: FeatureConfig, variation: Variation): void;
}

export class MetricsProcessor implements MetricsProcessorInterface {
  private environment: string;
  private cluster: string;
  private conf: Configuration;
  private options: Options;
  private eventBus: events.EventEmitter;
  private closed: boolean;
  private data: Map<string, AnalyticsEvent> = new Map();
  private syncInterval?: NodeJS.Timeout;
  private api: MetricsApi;
  private log: any;

  constructor(environment: string, cluster: string, conf: Configuration, options: Options, eventBus: events.EventEmitter, closed: boolean = false) {
    this.environment = environment;
    this.cluster = cluster || '1';
    this.conf = conf;
    this.options = options;
    this.eventBus = eventBus;
    this.closed = closed;

    const configuration = new Configuration({
      ...conf,
      basePath: options.eventsUrl,
    });

    this.api = new MetricsApi(configuration);
    this.log = options.logger;
  }

  start(): void {
    this.log.info('Starting MetricsProcessor with request interval: ', this.options.eventsSyncInterval);
    this.syncInterval = setInterval(() => this._send(), this.options.eventsSyncInterval);
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

  enqueue(target: Target, featureConfig: FeatureConfig, variation: Variation): void {
    const event: AnalyticsEvent = { target, featureConfig, variation, count: 0 };
    const key = this._formatKey(event);
    const found = this.data.get(key);
    if (found) {
      found.count++;
    } else {
      event.count = 1;
      this.data.set(key, event);
    }
  }

  private _formatKey(event: AnalyticsEvent): string {
    const feature = event.featureConfig.feature;
    const variation = event.variation.identifier;
    const value = event.variation.value;
    const target = GLOBAL_TARGET;
    return `${feature}/${variation}/${value}/${target}`;
  }

  private _summarize(): Metrics | unknown {
      const targetData: TargetData[] = [];
      const metricsData: MetricsData[] = [];

      // clone map and clear data
      const clonedData = new Map(data);
      data.clear();

      for (const event of clonedData.values()) {
        if (event.target && !event.target.anonymous) {
          let targetAttributes: KeyValue[] = [];
          if (event.target.attributes) {
            targetAttributes = Object.entries(event.target.attributes).map(
              ([key, value]) => {
                const stringValue =
                  value === null || value === undefined
                    ? ''
                    : valueToString(value);
                return { key, value: stringValue };
              },
            );
          }

          let targetName = event.target.identifier;
          if (event.target.name) {
            targetName = event.target.name;
          }

          const td: TargetData = {
            identifier: event.target.identifier,
            name: targetName,
            attributes: targetAttributes,
          };
          targetData.push(td);
        }

        const metricsAttributes: KeyValue[] = [
          {
            key: FEATURE_IDENTIFIER_ATTRIBUTE,
            value: event.featureConfig.feature,
          },
          {
            key: FEATURE_NAME_ATTRIBUTE,
            value: event.featureConfig.feature,
          },
          {
            key: VARIATION_IDENTIFIER_ATTRIBUTE,
            value: event.variation.identifier,
          },
          {
            key: SDK_TYPE_ATTRIBUTE,
            value: SDK_TYPE,
          },
          {
            key: SDK_LANGUAGE_ATTRIBUTE,
            value: SDK_LANGUAGE,
          },
          {
            key: SDK_VERSION_ATTRIBUTE,
            value: VERSION,
          },
          {
            key: TARGET_ATTRIBUTE,
            value: event?.target?.identifier ?? null,
          },
        ];

        // private target attributes
        // need more info

        const md: MetricsData = {
          timestamp: Date.now(),
          count: event.count,
          metricsType: MetricsDataMetricsTypeEnum.Ffmetrics,
          attributes: metricsAttributes,
        };
        metricsData.push(md);
      }
      return {
        targetData: targetData,
        metricsData: metricsData,
      };
  }

  private _send(): void {
    // Method implementation remains the same
  }

  private valueToString(value: any): string {
    return typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(value) : String(value);
  }
}
