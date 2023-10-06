import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import { AsyncKeyValueStore } from './types';

export class FileStore implements AsyncKeyValueStore {
  private keyv: Keyv;
  private keyvFile: KeyvFile;

  constructor(options = {}) {
    this.keyvFile = new KeyvFile(options);
    this.keyv = new Keyv({
      store: this.keyvFile,
    });
  }

  set(key: string, value: unknown): Promise<true> {
    return this.keyv.set(key, value);
  }

  get<T>(key: string): Promise<T> {
    return this.keyv.get(key);
  }

  del(key: string): Promise<boolean> {
    return this.keyv.delete(key);
  }

  keys(): Promise<Generator<string, void, void>> {
    return Promise.resolve((function* (keys: string[]) {
      for (const key of keys) {
        yield key;
      }
    })(this.keyvFile.keys()));
  }
}
