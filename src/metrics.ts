import {
  defaultOptions,
  FEATURE_IDENTIFIER_ATTRIBUTE,
  GLOBAL_TARGET,
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

const log = defaultOptions.logger;

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

export const MetricsProcessor = (
  environment: string,
  cluster = '1',
  conf: Configuration,
  options: Options,
): MetricsProcessorInterface => {
  const data: Map<string, AnalyticsEvent> = new Map<string, AnalyticsEvent>();
  let syncInterval: NodeJS.Timeout;

  const configuration = new Configuration({
    ...conf,
    basePath: options.eventsUrl,
  });
  const api = new MetricsApi(configuration);

  const enqueue = (
    target: Target,
    featureConfig: FeatureConfig,
    variation: Variation,
  ): void => {
    const event: AnalyticsEvent = {
      target,
      featureConfig,
      variation,
      count: 0,
    };

    const key = _formatKey(event);
    const found = data[key];
    if (found) {
      found.count++;
    } else {
      event.count = 1;
      data[key] = event;
    }
  };

  const _formatKey = (event: AnalyticsEvent): string => {
    const feature = event.featureConfig.feature;
    const variation = event.variation.identifier;
    const value = event.variation.value;
    const target = GLOBAL_TARGET;
    return `${feature}/${variation}/${value}/${target}`;
  };

  const _summarize = (): Metrics | unknown => {
    if (!data) {
      log.debug('No metrics data!');
      return;
    }
    const targetData: TargetData[] = [];
    const metricsData: MetricsData[] = [];

    for (const event of data.values()) {
      if (event.target && !event.target.anonymous) {
        let targetAttributes: KeyValue[] = [];
        if (event.target.attributes) {
          targetAttributes = Object.entries(event.target.attributes).map(
            ([key, value]) => ({ key, value: value as string}),
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
      ];

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
  };

  const _send = (): void => {
    const metrics: Metrics = _summarize();
    if (metrics) {
      log.debug('Start sending metrics data');
      api
        .postMetrics(environment, metrics, {
          params: {
            cluster: cluster,
          },
        })
        .then((response) => {
          log.debug('Metrics server returns: ', response.status);
          if (response.status >= 400) {
            log.error(
              'Error while sending metrics data with status code: ',
              response.status,
            );
          }
        })
        .catch((error: Error) => {
          log.debug('Metrics server returns error: ', error);
        });
    }
  };

  const start = (): void => {
    log.info(
      'Starting MetricsProcessor with request interval: ',
      options.eventsSyncInterval,
    );
    syncInterval = setInterval(_send, options.eventsSyncInterval);
  };

  const close = (): void => {
    log.info('Closing MetricsProcessor');
    clearInterval(syncInterval);
  };

  return {
    start,
    close,
    enqueue,
  };
};
