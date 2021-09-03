import { FeatureConfig, Segment } from "./openapi";

export type CacheValueType = FeatureConfig | Segment;

export interface Cache {
  set(key: string, value: CacheValueType): void;
  get(key: string): CacheValueType;
  del(key: string): void;
}

export class SimpleCache implements Cache {
  private cache = {};

  set(key: string, value: CacheValueType): void {
    this.cache[key] = value;
  }
  get(key: string): CacheValueType {
    return this.cache[key];
  }
  del(key: string): void {
    delete this.cache[key];
  }
}

export const formatFlagKey = (key: string): string => {
    return `flags/${key}`
}

export const formatSegmentKey = (key: string): string => {
    return `segments/${key}`
}