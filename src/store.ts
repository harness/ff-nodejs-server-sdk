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

  set(key: string, value: unknown): Promise<true> {
    return this.keyv.set(key, value);
  }
  get(key: string): Promise<unknown> {
    return this.keyv.get(key);
  }
  del(key: string): Promise<boolean> {
    return this.keyv.delete(key);
  }
}
