import { KeyValueStore } from './types';

export class SimpleCache implements KeyValueStore {
  private cache = {};

  set(key: string, value: unknown): void {
    this.cache[key] = value;
  }

  get(key: string): unknown {
    return this.cache[key];
  }

  delete(key: string): void {
    delete this.cache[key];
  }

  *keys(): Generator<string, void, void> {
    for (const key of Object.keys(this.cache)) {
      yield key;
    }
  }
}
