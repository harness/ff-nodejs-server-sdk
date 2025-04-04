import { Logger } from './log';
import { FeatureConfig, Segment } from './openapi';

export type Type = boolean | string | number | Record<string, unknown>;
export interface Options {
  baseUrl?: string;
  eventsUrl?: string;
  pollInterval?: number;
  eventsSyncInterval?: number;
  enableStream?: boolean;
  enableAnalytics?: boolean;
  cache?: KeyValueStore;
  store?: AsyncKeyValueStore;
  logger?: Logger;
  tlsTrustedCa?: string;
  axiosTimeout?: number;
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
