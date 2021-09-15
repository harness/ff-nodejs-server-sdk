import { Operator } from './types';

export class Str implements Operator {
  private value: string;
  constructor(value: string) {
    this.value = value;
  }
  startsWith(value: string[]): boolean {
    return this.value.startsWith(value?.[0]);
  }
  endsWith(value: string[]): boolean {
    return this.value.endsWith(value?.[0]);
  }
  match(value: string[]): boolean {
    return this.value.match(value?.[0]) !== undefined;
  }
  contains(value: string[]): boolean {
    return this.value.includes(value?.[0]);
  }
  equalSensitive(value: string[]): boolean {
    return this.value === value?.[0];
  }
  equal(value: string[]): boolean {
    return this.value.toLocaleLowerCase() === value?.[0]?.toLocaleLowerCase();
  }
  greaterThan(value: string[]): boolean {
    return this.value > value?.[0];
  }
  greaterThanEqual(value: string[]): boolean {
    return this.value >= value?.[0];
  }
  lessThan(value: string[]): boolean {
    return this.value < value?.[0];
  }
  lessThanEqual(value: string[]): boolean {
    return this.value <= value?.[0];
  }
  inList(value: string[]): boolean {
    return value.includes(this.value);
  }
}
