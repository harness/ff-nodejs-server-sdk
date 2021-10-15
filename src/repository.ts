import EventEmitter from 'events';
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

export enum RepositoryEvent {
  FLAG_STORED = 'flag_stored',
  FLAG_DELETED = 'flag_deleted',
  SEGMENT_STORED = 'segment_stored',
  SEGMENT_DELETED = 'segment_deleted',
}

export class StorageRepository implements Repository {
  private cache: KeyValueStore;
  private store: AsyncKeyValueStore;
  private eventBus: EventEmitter;

  constructor(
    cache: KeyValueStore,
    store?: AsyncKeyValueStore,
    eventBus?: EventEmitter,
  ) {
    if (!cache) {
      throw new Error('Cache is required argument and cannot be undefined');
    }
    this.eventBus = eventBus;
    this.cache = cache;
    this.store = store;
  }

  async setFlag(identifier: string, fc: FeatureConfig): Promise<void> {
    if (await this.isFlagOutdated(identifier, fc)) {
      return;
    }
    const flagKey = this.formatFlagKey(identifier);
    if (this.store) {
      await this.store.set(flagKey, fc);
      this.cache.del(flagKey);
    } else {
      this.cache.set(flagKey, fc);
    }
    if (this.eventBus) {
      this.eventBus.emit(RepositoryEvent.FLAG_STORED, identifier);
    }
  }

  async setSegment(identifier: string, segment: Segment): Promise<void> {
    if (await this.isSegmentOutdated(identifier, segment)) {
      return;
    }
    const segmentKey = this.formatSegmentKey(identifier);
    if (this.store) {
      await this.store.set(segmentKey, segment);
      this.cache.del(segmentKey);
    } else {
      this.cache.set(segmentKey, segment);
    }
    if (this.eventBus) {
      this.eventBus.emit(RepositoryEvent.SEGMENT_STORED, identifier);
    }
  }

  async deleteFlag(identifier: string): Promise<void> {
    const flagKey = this.formatFlagKey(identifier);
    if (this.store) {
      await this.store.del(flagKey);
    }
    this.cache.del(flagKey);
    if (this.eventBus) {
      this.eventBus.emit(RepositoryEvent.FLAG_DELETED, identifier);
    }
  }

  async deleteSegment(identifier: string): Promise<void> {
    const segmentKey = this.formatSegmentKey(identifier);
    if (this.store) {
      await this.store.del(segmentKey);
    }
    this.cache.del(segmentKey);
    if (this.eventBus) {
      this.eventBus.emit(RepositoryEvent.SEGMENT_DELETED, identifier);
    }
  }

  async getFlag(identifier: string, cacheable = true): Promise<FeatureConfig> {
    const flagKey = this.formatFlagKey(identifier);
    let flag = this.cache.get(flagKey) as FeatureConfig;
    if (flag) {
      return flag;
    }
    if (this.store) {
      flag = await this.store.get<FeatureConfig>(flagKey);
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
      segment = await this.store.get<Segment>(segmentKey);
      if (segment && cacheable) {
        this.cache.set(segmentKey, segment);
      }
      return segment;
    }
    return undefined;
  }

  private async isFlagOutdated(
    key: string,
    flag: FeatureConfig,
  ): Promise<boolean> {
    const oldFlag = await this.getFlag(key, false); // dont set cacheable, we are just checking the version
    return oldFlag?.version && oldFlag.version >= flag?.version;
  }

  private async isSegmentOutdated(
    key: string,
    segment: Segment,
  ): Promise<boolean> {
    const oldSegment = await this.getSegment(key, false); // dont set cacheable, we are just checking the version
    return oldSegment?.version && oldSegment.version >= segment?.version;
  }

  private formatFlagKey(key: string): string {
    return `flags/${key}`;
  }

  private formatSegmentKey(key: string): string {
    return `segments/${key}`;
  }
}
