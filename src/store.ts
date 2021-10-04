import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import { AsyncKeyValueStore } from './types';

export class FileStore implements AsyncKeyValueStore {
  private keyv: Keyv;

  constructor(options = {}) {
    this.keyv = new Keyv({
      store: new KeyvFile(options),
    });
  }

  set<T>(key: string, value: T): Promise<true> {
    return this.keyv.set(key, value);
  }
  get<T>(key: string): Promise<T> {
    return this.keyv.get(key);
  }
  del(key: string): Promise<boolean> {
    return this.keyv.delete(key);
  }
}
