import { Operator } from './types';

export class Bool implements Operator {
  private value: boolean;

  constructor(value: boolean) {
    this.value = value;
  }
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
  equal(value: string[]): boolean {
    return this.value === (value[0].toLowerCase() === 'true');
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
    return this.value;
  }
}
