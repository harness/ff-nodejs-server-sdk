import { Logger } from './log';
import { FeatureConfig, Segment } from './openapi';

export type Type = boolean | string | number | Record<string, unknown>;
export interface Options {
  /**
   * The URL used to fetch Feature Flag Evaluations. When using the Relay Proxy, change this to: http://localhost:7000
   *
   * @defaultValue https://config.ff.harness.io/api/1.0
   */
  baseUrl?: string;
  /**
   * The URL for posting metrics data to the Feature Flag service. When using the Relay Proxy, change this to: http://localhost:7000
   *
   * @defaultValue https://events.ff.harness.io/api/1.0
   */
  eventsUrl?: string;
  /**
   * The interval in milliseconds that we poll for changes when you are not using streaming mode.
   *
   * @defaultValue 60000
   */
  pollInterval?: number;
  /**
   * The interval in milliseconds to post analytics data to the Feature Flag service.
   *
   * @defaultValue 60000
   */
  eventsSyncInterval?: number;
  /**
   * Set to true to enable streaming mode. Set to false to disable streaming mode.
   *
   * @defaultValue true
   */
  enableStream?: boolean;
  /**
   * Set to true to enable analytics. Set to false to disable analytics. Note: When enabled, analytics data is posted every `eventsSyncInterval`.
   *
   * @defaultValue true
   */
  enableAnalytics?: boolean;
  cache?: KeyValueStore;
  store?: AsyncKeyValueStore;
  /**
   * Set a custom logger to use for logging.
   *
   * @defaultValue console
   */
  logger?: Logger;
  tlsTrustedCa?: string;
  /**
   * Set the timeout for requests to the Feature Flag service.
   *
   * @defaultValue 30000
   */
  axiosTimeout?: number;
  /**
   * Set the number of retries for requests to the Feature Flag service.
   *
   * @defaultValue Infinity
   */
  axiosRetries?: number;
}

export interface APIConfiguration {
  targetSegmentRulesQueryParameter: string;
}

export interface Claims {
  environment: string;
  environmentIdentifier: string;
  project: string;
  projectIdentifier: string;
  accountID: string;
  organization: string;
  organizationIdentifier: string;
  clusterIdentifier: string;
  key_type: 'Server';
}

export interface StreamMsg {
  event: string;
  domain: string;
  identifier: string;
  version: number;
}

export enum StreamEvent {
  READY = 'stream_ready',
  CONNECTED = 'stream_connected',
  RETRYING = 'stream_retrying',
  DISCONNECTED = 'stream_disconnected',
  CHANGED = 'stream_changed',
  ERROR = 'stream_error',
}

export interface Operator {
  startsWith(value: string[]): boolean;
  endsWith(value: string[]): boolean;
  match(value: string[]): boolean;
  contains(value: string[]): boolean;
  equalSensitive(value: string[]): boolean;
  equal(value: string[]): boolean;
  greaterThan(value: string[]): boolean;
  greaterThanEqual(value: string[]): boolean;
  lessThan(value: string[]): boolean;
  lessThanEqual(value: string[]): boolean;
  inList(value: string[]): boolean;
}

export interface Query {
  getFlag(identifier: string, cacheable?: boolean): Promise<FeatureConfig>;
  getSegment(identifier: string, cacheable?: boolean): Promise<Segment>;
  findFlagsBySegment(segment: string): Promise<string[]>;
}

export interface KeyValueStore {
  set(key: string, value: unknown): void;
  get(key: string): unknown;
  delete(key: string): void;
  keys(): Generator<string, void, void>;
}

export interface AsyncKeyValueStore {
  set(key: string, value: unknown): Promise<true>;
  get<T>(key: string): Promise<T>;
  del(key: string): Promise<boolean>;
  keys(): Promise<Generator<string, void, void>>;
}

export interface Target {
  identifier: string;
  name: string;
  anonymous?: boolean;
  attributes?: Record<string, unknown>;
}
