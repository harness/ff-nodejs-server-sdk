import { Operator } from "./types";

export class Num implements Operator {
    private value: number;

    constructor(value: number) {
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
        return this.value === parseFloat(value?.[0]);
    }
    greaterThan(value: string[]): boolean {
        return this.value > parseFloat(value?.[0]);
    }
    greaterThanEqual(value: string[]): boolean {
        return this.value >= parseFloat(value?.[0]);
    }
    lessThan(value: string[]): boolean {
        return this.value < parseFloat(value?.[0]);
    }
    lessThanEqual(value: string[]): boolean {
        return this.value <= parseFloat(value?.[0]);
    }
    inList(value: string[]): boolean {
        const numArray = value.map((elem) => parseFloat(elem));
        return numArray.includes(this.value);
    }
}