import Client from './client';
import LRU from 'lru-cache';
import { Options, Target } from './types';
import { Logger } from './log';
import { AsyncKeyValueStore, KeyValueStore } from './types';
import { FileStore } from './store';

export {
  Client,
  Options,
  Target,
  AsyncKeyValueStore,
  KeyValueStore,
  Logger,
  LRU,
  FileStore,
};
export default {
  instance: undefined,
  init: function (sdkKey: string, options: Options): void {
    if (!this.instance) {
      this.instance = new Client(sdkKey, options);
    }
  },
  boolVariation: function (
    identifier: string,
    target: Target,
    defaultValue = false,
  ): Promise<boolean> {
    return this.instance.boolVariation(identifier, target, defaultValue);
  },
  stringVariation: function (
    identifier: string,
    target: Target,
    defaultValue = '',
  ): Promise<string> {
    return this.instance.stringVariation(identifier, target, defaultValue);
  },
  numberVariation: function (
    identifier: string,
    target: Target,
    defaultValue = 0,
  ): Promise<number> {
    return this.instance.numberVariation(identifier, target, defaultValue);
  },
  jsonVariation: function (
    identifier: string,
    target: Target,
    defaultValue = '',
  ): Promise<Record<string, unknown>> {
    return this.instance.jsonVariation(identifier, target, defaultValue);
  },
  close: function (): void {
    return this.instance.close();
  },
};
