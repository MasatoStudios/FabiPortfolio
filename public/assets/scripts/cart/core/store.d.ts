declare type Subscriber<T> = [(value: T) => void, () => void];
export declare class Store<T = unknown> {
    value: T;
    subscribers: Subscriber<T>[];
    subscriberQueue: T[];
    private stop;
    constructor(value: T);
    private static neq;
    set(...args: any[]): void;
    trigger(): void;
    update(fn: (value: T) => T): void;
    subscribe(run: (value: T) => void, invalidate?: () => void): () => void;
    unsubscribe(subscriber: Subscriber<T>): void;
}