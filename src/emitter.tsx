// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

export type Observer<TEvent> = (event: TEvent) => void;

export interface Observable<TEvent> {
    observe(observer: Observer<TEvent>): () => void;
    unobserve(observer: Observer<TEvent>): void;
}

export function createEmitter<TEvent>(): MutEmitter<TEvent> {
    return new MutEmitter;
}

export function createInterval(ms: number, start: boolean = true): IntervalEmitter {
    return new IntervalEmitter(ms, start);
}

export function createTimeout(ms: number): TimeoutEmitter {
    return new TimeoutEmitter(ms);
}

export abstract class Emitter<TEvent> implements Observable<TEvent> {
    abstract observe(observer: Observer<TEvent>): () => void;
    abstract unobserve(observer: Observer<TEvent>): void;

    map<TOut>(f: (event: TEvent) => TOut): Emitter<TOut> {
        return new MappingEmitter(this, f);
    }

    filter(f: (event: TEvent) => boolean): Emitter<TEvent> {
        return new FilteringEmitter(this, f);
    }

    indexed(): Emitter<number> {
        return new IndexingEmitter(this);
    }

    next(): Promise<TEvent> {
        return new Promise(resolve => {
            const unobserve = this.observe(x => {
                unobserve();
                resolve(x);
            });
        });
    }

    static from<TEvent>(observable: Observable<TEvent>): Emitter<TEvent> {
        return new MappingEmitter(observable, x => x);
    }
}

abstract class ObserverEmitter<TEvent> extends Emitter<TEvent> {
    private observers = new Set<Observer<TEvent>>;

    protected init(): void {
    }

    protected destroy(): void {
    }

    protected emitEvent(event: TEvent) {
        this.observers.forEach(observer => observer(event));
    }

    protected get observed(): boolean {
        return !!this.observers.size;
    }

    observe(observer: Observer<TEvent>): () => void {
        if (!this.observers.size) {
            this.init();
        }
        this.observers.add(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: Observer<TEvent>): void {
        this.observers.delete(observer);
        if (!this.observers.size) {
            this.destroy();
        }
    }
}

class MappingEmitter<TIn, TOut> extends ObserverEmitter<TOut> {
    private sourceObserver = (event: TIn) => {
        this.emitEvent(this.f(event));
    };

    constructor(protected source: Observable<TIn>, protected f: (value: TIn) => TOut) {
        super();
    }

    protected init() {
        this.source.observe(this.sourceObserver);
    }

    protected destroy() {
        this.source.unobserve(this.sourceObserver);
    }
}

class FilteringEmitter<TEvent> extends ObserverEmitter<TEvent> {
    private sourceObserver = (event: TEvent) => {
        if (this.f(event)) {
            this.emitEvent(event);
        }
    };

    constructor(protected source: Observable<TEvent>, protected f: (value: TEvent) => boolean) {
        super();
    }

    protected init() {
        this.source.observe(this.sourceObserver);
    }

    protected destroy() {
        this.source.unobserve(this.sourceObserver);
    }
}

class IndexingEmitter extends ObserverEmitter<number> {
    private nextIndex = 0;
    private sourceObserver = () => {
        this.emitEvent(this.nextIndex++);
    };

    constructor(protected source: Observable<unknown>) {
        super();
    }

    protected init() {
        this.source.observe(this.sourceObserver);
    }

    protected destroy() {
        this.source.unobserve(this.sourceObserver);
    }
}

export class MutEmitter<TEvent> extends ObserverEmitter<TEvent> {
    emit(event: TEvent): void {
        this.emitEvent(event);
    }

    asEmitter(): Emitter<TEvent> {
        return this.map(e => e);
    }
}

export class IntervalEmitter extends ObserverEmitter<void> {
    private interval?: number;

    constructor(
        private ms: number,
        private started = true,
    ) {
        super();
    }

    private set() {
        if (!this.interval) {
            this.interval = window.setInterval(() => {
                this.emitEvent();
            }, this.ms)
        }
    }

    private clear() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    protected init() {
        if (this.started) {
            this.set();
        }
    }

    protected destroy() {
        this.clear();
    }

    start() {
        this.started = true;
        if (this.observed) {
            this.set();
        }
    }

    stop() {
        this.started = false;
        this.clear();
    }
}

export class TimeoutEmitter extends ObserverEmitter<void> {
    private timeout?: number;

    constructor(
        private ms: number,
    ) {
        super();
    }

    private set() {
        if (!this.timeout) {
            this.timeout = window.setTimeout(() => {
                this.emitEvent();
            }, this.ms)
        }
    }

    private clear() {
        if (this.timeout) {
            clearInterval(this.timeout);
            this.timeout = undefined;
        }
    }

    protected init() {
        this.set();
    }

    protected destroy() {
        this.clear();
    }

    reset() {
        if (this.observed) {
            this.clear();
            this.set();
        }
    }
}
