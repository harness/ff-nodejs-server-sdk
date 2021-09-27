import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import { KeyValueStore } from "./types";


export class FileStore implements KeyValueStore {

    private keyv: Keyv;

    constructor() {
        this.keyv = new Keyv({
            store: new KeyvFile()
        })
    }

    set(key: string, value: unknown): void {
        this.keyv.set(key, value);
    }
    get(key: string): unknown {
        return this.keyv.get(key);
    }
    del(key: string): void {
        this.keyv.delete(key);
    }

}