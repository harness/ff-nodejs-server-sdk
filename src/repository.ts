import { FeatureConfig, Segment } from './openapi';
import { AsyncKeyValueStore, KeyValueStore, Query } from './types';

export interface Repository extends Query {
  // put values
  setFlag(identifier: string, fc: FeatureConfig): Promise<void>;
  setSegment(identifier: string, segment: Segment): Promise<void>;

  // remove values
  deleteFlag(identifier: string): Promise<void>;
  deleteSegment(identifier: string): Promise<void>;
}

export class StorageRepository implements Repository {
  private cache: KeyValueStore;
  private store: AsyncKeyValueStore;

  constructor(cache: KeyValueStore, store?: AsyncKeyValueStore) {
    if (!cache) {
      throw new Error('Cache is required argument and connot be undefined');
    }
    this.cache = cache;
    this.store = store;
  }

  async setFlag(identifier: string, fc: FeatureConfig): Promise<void> {
    const flagKey = this.formatFlagKey(identifier);
    if (await this.isFlagOutdated(flagKey, fc)) {
      return undefined;
    }
    if (this.store) {
      this.store.set(flagKey, fc).then(_value => {
        this.cache.del(flagKey);
      });
    } else {
      this.cache.set(flagKey, fc);
    }
    return undefined
  }

  async setSegment(identifier: string, segment: Segment): Promise<void> {
    const segmentKey = this.formatSegmentKey(identifier);
    if (await this.isSegmentOutdated(segmentKey, segment)) {
      return undefined;
    }
    if (this.store) {
      this.store.set(segmentKey, segment).then(_value => {
        this.cache.del(segmentKey);
      });
    } else {
      this.cache.set(segmentKey, segment);
    }
    return undefined;
  }

  deleteFlag(identifier: string): Promise<void> {
    const flagKey = this.formatFlagKey(identifier);
    if (this.store) {
      this.store.del(flagKey);
    }
    this.cache.del(flagKey);
    return undefined;
  }

  deleteSegment(identifier: string): Promise<void> {
    const segmentKey = this.formatSegmentKey(identifier);
    if (this.store) {
      this.store.del(segmentKey);
    }
    this.cache.del(segmentKey);
    return undefined;
  }

  async getFlag(identifier: string, cacheable = true): Promise<FeatureConfig> {
    const flagKey = this.formatFlagKey(identifier);
    let flag = this.cache.get(flagKey) as FeatureConfig;
    if (flag) {
      return flag;
    }
    if (this.store) {
      flag = await this.store.get(flagKey) as FeatureConfig;
      if (flag && cacheable) {
        this.cache.set(flagKey, flag);
      }
      return flag;
    }
    return undefined;
  }

  async getSegment(identifier: string, cacheable = true): Promise<Segment> {
    const segmentKey = this.formatSegmentKey(identifier);
    let segment = this.cache.get(segmentKey) as Segment;
    if (segment) {
      return segment;
    }
    if (this.store) {
      segment = await this.store.get(segmentKey) as Segment;
      if (segment && cacheable) {
        this.cache.set(segmentKey, segment);
      }
      return segment;
    }
    return undefined;
  }

  private async isFlagOutdated(key: string, flag: FeatureConfig): Promise<boolean> {
    const oldFlag = await this.getFlag(key, false); // dont set cacheable, we are just checking the version
    return oldFlag?.version && oldFlag.version > flag?.version;
  }

  private async isSegmentOutdated(key: string, segment: Segment): Promise<boolean> {
    const oldSegment = await this.getSegment(key, false); // dont set cacheable, we are just checking the version
    return oldSegment?.version && oldSegment.version > segment?.version;
  }

  private formatFlagKey(key: string): string {
    return `flags/${key}`;
  }

  private formatSegmentKey(key: string): string {
    return `segments/${key}`;
  }
}
