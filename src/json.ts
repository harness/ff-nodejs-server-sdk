import { Operator } from './types';

export class Json implements Operator {
  startsWith(_value: string[]): boolean {
    return false;
  }
  endsWith(_value: string[]): boolean {
    return false;
  }
  match(_value: string[]): boolean {
    return false;
  }
  contains(_value: string[]): boolean {
    return false;
  }
  equalSensitive(_value: string[]): boolean {
    return false;
  }
  equal(_value: string[]): boolean {
    return false;
  }
  greaterThan(_value: string[]): boolean {
    return false;
  }
  greaterThanEqual(_value: string[]): boolean {
    return false;
  }
  lessThan(_value: string[]): boolean {
    return false;
  }
  lessThanEqual(_value: string[]): boolean {
    return false;
  }
  inList(_value: string[]): boolean {
    return false;
  }
}
