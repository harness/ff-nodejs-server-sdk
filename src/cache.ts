import { KeyValueStore } from './types';

export class SimpleCache implements KeyValueStore {
  private cache = {};

  set(key: string, value: unknown): void {
    this.cache[key] = value;
  }
  get(key: string): unknown {
    return this.cache[key];
  }
  del(key: string): void {
    delete this.cache[key];
  }
}
