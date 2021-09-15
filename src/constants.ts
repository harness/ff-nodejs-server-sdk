import { SimpleCache } from "./cache";
import { ConsoleLog } from "./log";
import { Options } from "./types";

export const ONE_HUNDRED = 100;

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
  PERSIST_INTERVAL = 1 * MINUTE,
  EVENTS_SYNC_INTERVAL = 1 * MINUTE;

export const defaultOptions: Options = {
  baseUrl: BASE_URL,
  eventsUrl: EVENTS_URL,
  pollInterval: PULL_INTERVAL,
  persistInterval: PERSIST_INTERVAL,
  eventsSyncInterval: EVENTS_SYNC_INTERVAL,
  enableStream: true,
  enableAnalytics: true,
  cache: new SimpleCache(),
  logger: new ConsoleLog(),
};
