import { FeatureConfig, Segment } from './openapi';
import { KeyValueStore, Query } from './types';

export interface Repository extends Query {
  // put values
  setFlag(identifier: string, fc: FeatureConfig): void;
  setSegment(identifier: string, segment: Segment): void;

  // remove values
  deleteFlag(identifier: string): void;
  deleteSegment(identifier: string): void;
}

export class StorageRepository implements Repository {
  private cache: KeyValueStore;
  private store: KeyValueStore;

  constructor(cache: KeyValueStore, store: KeyValueStore) {
    if (!cache)
      throw new Error('Cache is required argument and connot be undefined');
    this.cache = cache;
    this.store = store;
  }

  setFlag(identifier: string, fc: FeatureConfig): void {
    const flagKey = this.formatFlagKey(identifier);
    if (this.store) {
      this.store.set(flagKey, fc);
      this.cache.del(flagKey);
    } else {
      this.cache.set(flagKey, fc);
    }
  }

  setSegment(identifier: string, segment: Segment): void {
    const segmentKey = this.formatSegmentKey(identifier);
    if (this.store) {
      this.store.set(segmentKey, segment);
      this.cache.del(segmentKey);
    } else {
      this.cache.set(segmentKey, segment);
    }
  }

  deleteFlag(identifier: string): void {
    const flagKey = this.formatFlagKey(identifier);
    if (this.store) {
      this.store.del(flagKey);
    }
    this.cache.del(flagKey);
  }

  deleteSegment(identifier: string): void {
    const segmentKey = this.formatSegmentKey(identifier);
    if (this.store) {
      this.store.del(segmentKey);
    }
    this.cache.del(segmentKey);
  }

  getFlag(identifier: string): FeatureConfig {
    const flagKey = this.formatFlagKey(identifier);
    let flag = this.cache.get(flagKey) as FeatureConfig;
    if (flag) {
      return flag;
    }
    if (this.store) {
      flag = this.store.get(flagKey) as FeatureConfig;
      if (flag) {
        this.cache.set(flagKey, flag);
      }
      return flag;
    }
    return undefined;
  }

  getSegment(identifier: string): Segment {
    const segmentKey = this.formatSegmentKey(identifier);
    let segment = this.cache.get(segmentKey) as Segment;
    if (segment) {
      return segment;
    }
    if (this.store) {
      segment = this.store.get(segmentKey) as Segment;
      if (segment) {
        this.cache.set(segmentKey, segment);
      }
      return segment;
    }
    return undefined;
  }

  private formatFlagKey(key: string): string {
    return `flags/${key}`;
  }

  private formatSegmentKey(key: string): string {
    return `segments/${key}`;
  }
}
