import Client from './client';
import { Options, Target } from './types';
import { Logger } from './log';
import { KeyValueStore } from './types';

export { Client, Options, Target, KeyValueStore, Logger };
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
  ): boolean {
    return this.instance.boolVariation(identifier, target, defaultValue);
  },
  stringVariation: function (
    identifier: string,
    target: Target,
    defaultValue = '',
  ): string {
    return this.stringVariation(identifier, target, defaultValue);
  },
  numberVariation: function (
    identifier: string,
    target: Target,
    defaultValue = 0,
  ): number {
    return this.instance.numberVariation(identifier, target, defaultValue);
  },
  jsonVariation: function (
    identifier: string,
    target: Target,
    defaultValue = '',
  ): Record<string, unknown> {
    return this.instance.jsonVariation(identifier, target, defaultValue);
  },
};
