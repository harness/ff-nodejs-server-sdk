import LRU from 'lru-cache';
import { ConsoleLog } from './log';
import { FileStore } from './store';
import { APIConfiguration, Options } from './types';

export const ONE_HUNDRED = 100;

export const FF_METRIC_TYPE = 'FFMETRICS',
  FEATURE_IDENTIFIER_ATTRIBUTE = 'featureIdentifier',
  FEATURE_NAME_ATTRIBUTE = 'featureName',
  VARIATION_IDENTIFIER_ATTRIBUTE = 'variationIdentifier',
  VARIATION_VALUE_ATTRIBUTE = 'featureValue',
  TARGET_ATTRIBUTE = 'target',
  SDK_VERSION_ATTRIBUTE = 'SDK_VERSION',
  SDK_TYPE_ATTRIBUTE = 'SDK_TYPE',
  SDK_TYPE = 'server',
  SDK_LANGUAGE_ATTRIBUTE = 'SDK_LANGUAGE',
  SDK_LANGUAGE = 'javascript',
  GLOBAL_TARGET = 'global';

export const SEGMENT_MATCH_OPERATOR = 'segmentMatch',
  IN_OPERATOR = 'in',
  EQUAL_OPERATOR = 'equal',
  GT_OPERATOR = 'gt',
  STARTS_WITH_OPERATOR = 'starts_with',
  ENDS_WITH_OPERATOR = 'ends_with',
  CONTAINS_OPERATOR = 'contains',
  EQUAL_SENSITIVE_OPERATOR = 'equal_sensitive';

export const BASE_URL = 'https://config.ff.harness.io/api/1.0',
  EVENTS_URL = 'https://events.ff.harness.io/api/1.0',
  SECOND = 1000,
  MINUTE = 60 * SECOND,
  PULL_INTERVAL = 1 * MINUTE,
  EVENTS_SYNC_INTERVAL = 1 * MINUTE;

export const defaultOptions: Options = {
  baseUrl: BASE_URL,
  eventsUrl: EVENTS_URL,
  pollInterval: PULL_INTERVAL,
  eventsSyncInterval: EVENTS_SYNC_INTERVAL,
  enableStream: true,
  enableAnalytics: true,
  cache: new LRU({ max: 100 }),
  store: new FileStore(),
  logger: new ConsoleLog(),
  axiosTimeout: 30000,
  axiosRetries: 3,
};

const TARGET_SEGMENT_RULES_QUERY_PARAMETER = 'v2';
export const apiConfiguration: APIConfiguration = {
  targetSegmentRulesQueryParameter: TARGET_SEGMENT_RULES_QUERY_PARAMETER,
};
