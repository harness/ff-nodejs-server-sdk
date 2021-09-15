import { Logger } from './log';
import { FeatureConfig, Segment } from './openapi';

export type Type = boolean | string | number | Record<string, unknown>;
export interface Options {
  baseUrl?: string;
  eventsUrl?: string;
  pollInterval?: number;
  persistInterval?: number;
  eventsSyncInterval?: number;
  enableStream?: boolean;
  enableAnalytics?: boolean;
  cache?: KeyValueStore;
  store?: KeyValueStore;
  logger?: Logger;
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

export enum Event {
  READY = 'ready',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CHANGED = 'changed',
  ERROR = 'error'
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
  getFlag(identifier: string): FeatureConfig;
  getSegment(identifier: string): Segment;
}

export interface KeyValueStore {
  set(key: string, value: unknown): void;
  get(key: string): unknown;
  del(key: string): void;
}

export interface Target {
  identifier: string;
  name: string;
  anonymous?: boolean;
  attributes?: Record<string, unknown>;
}