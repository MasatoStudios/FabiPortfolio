export interface StoreArray<T = unknown> extends StoreExtendable<T[]>, Array<T> {
}
export declare class StoreArray<T = unknown> extends StoreExtendable<T[]> {
    constructor(length?: number);
    [Symbol.iterator](): IterableIterator<T>;
    get length(): number;
    removeAt(index: number): void;
    remove(...items: T[]): void;
    setAt(index: number, newValue: T): void;
    getAt(index: number): T;
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    splice(start: number, deleteCount?: number): T[];
    reverse(): T[];
    sort(compareFn?: (a: T, b: T) => number): this;
}