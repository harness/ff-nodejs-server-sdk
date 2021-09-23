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
  let data: Record<string, AnalyticsEvent>;
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
    const feature = event.featureConfig.feature,
      variation = event.variation.identifier,
      value = event.variation.value,
      target = GLOBAL_TARGET;
    return `${feature}/${variation}/${value}/${target}`;
  };

  const _summarize = (): Metrics | unknown => {
    if (!data) {
      log.debug('No metrics data!');
      return;
    }
    const targetData: TargetData[] = [];
    const metricsData: MetricsData[] = [];

    for (const [, event] of Object.entries(data)) {
      if (event.target && !event.target.anonymous) {
        const targetAttributes: KeyValue[] = [];
        if (event.target.attributes)
          for (const [key, value] of Object.entries(event.target.attributes))
            targetAttributes.push({ key, value: value as string });

        let targetName = event.target.identifier;
        if (event.target.name) targetName = event.target.name;

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
    api.postMetrics(environment, metrics, {
      params: {
        cluster: cluster,
      },
    });
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
