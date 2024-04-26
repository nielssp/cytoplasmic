// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

export type Observer<TEvent> = (event: TEvent) => void;

/**
 * Common interface for {@link Emitter} and {@link Cell}.
 */
export interface Observable<TEvent> {
    /**
     * Attach an observer.
     *
     * @param observer - The observer function to attach.
     * @returns A function that can be called to detach the observer.
     * Alternatively {@link unobserve} can be called.
     */
    observe(observer: Observer<TEvent>): () => void;
    /**
     * Detach an observer.
     *
     * @param observer - The observer function to detach.
     */
    unobserve(observer: Observer<TEvent>): void;
}

/**
 * Create an event emitter. Use {@link MutEmitter.emit} to emit events.
 * 
 * @returns A mutable event emitter
 */
export function createEmitter<TEvent>(): MutEmitter<TEvent> {
    return new MutEmitter;
}

/**
 * Create an emitter that repeatedly emits events with a fixed time delay
 * between each event. The interval doesn't start until the emitter is observed, and
 * stops when there are no more observers.
 *
 * @param ms - Delay in milliseconds between each event and before the first
 * event.
 * @param start - Whether to start the emitter.
 * @returns An emitter.
 */
export function createInterval(ms: number, start: boolean = true): IntervalEmitter {
    return new IntervalEmitter(ms, start);
}

/**
 * Create an emitter that fires a single event after a fixed time delay. The
 * timer doesn't start until the emitter is observed, and resets when there are
 * no more observers.
 *
 * @param ms - Delay in milliseconds before the event is fired.
 * @returns An Emitter
 */
export function createTimeout(ms: number): TimeoutEmitter {
    return new TimeoutEmitter(ms);
}

/**
 * An event emitter
 */
export abstract class Emitter<TEvent> implements Observable<TEvent> {
    abstract observe(observer: Observer<TEvent>): () => void;
    abstract unobserve(observer: Observer<TEvent>): void;

    /**
     * Apply a function to all events emitted by this emitter.
     *
     * @param f - The function to apply to events.
     * @returns An emitter that applies the function `f` to all events emitted
     * by this emitter.
     */
    map<TOut>(f: (event: TEvent) => TOut): Emitter<TOut> {
        return new MappingEmitter(this, f);
    }

    /**
     * Filter events emitted by this emitter.
     *
     * @param f - The predicate to apply to each event.
     * @returns An emitter than only emits events emitted by this emitter
     * for which `f` returns true.
     */
    filter(f: (event: TEvent) => boolean): Emitter<TEvent> {
        return new FilteringEmitter(this, f);
    }

    /**
     * Creates an emitter that counts events emitted by this emitter.
     *
     * @returns An emitter that emits the index, starting at zero, of every
     * event emitted by this emitter.
     */
    indexed(): Emitter<number>;
    /**
     * Apply a function to all events and their index (starting at zero) emitted
     * by this emitter.
     *
     * @returns An emitter that applies the function `f` to all events emitted
     * by this emitter.
     */
    indexed<TOut>(f: (event: TEvent, index: number) => TOut): Emitter<TOut>;
    indexed<TOut>(f?: (event: TEvent, index: number) => TOut): Emitter<TOut> | Emitter<number> {
        if (f) {
            return new IndexingEmitter(this, f);
        } else {
            return new IndexingEmitter(this, (_, index) => index);
        }
    }

    /**
     * Create a promise that resolves the next time an event is emitted by this
     * emitter.
     *
     * @return A promise that resolves to the next event emitted by this
     * emitter.
     */
    next(): Promise<TEvent> {
        return new Promise(resolve => {
            const unobserve = this.observe(x => {
                unobserve();
                resolve(x);
            });
        });
    }

    /**
     * Create an emitter from another observable (cell or emitter). The
     * resulting emitter emits an even whenever the input observable emits and
     * event.
     *
     * @param observable - The observable to wrap.
     * @returns An emitter that emits the same events as `observable`.
     */
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

    constructor(protected source: Observable<TIn>, protected f: (event: TIn) => TOut) {
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

    constructor(protected source: Observable<TEvent>, protected f: (event: TEvent) => boolean) {
        super();
    }

    protected init() {
        this.source.observe(this.sourceObserver);
    }

    protected destroy() {
        this.source.unobserve(this.sourceObserver);
    }
}

class IndexingEmitter<TIn, TOut> extends ObserverEmitter<TOut> {
    private nextIndex = 0;
    private sourceObserver = (event: TIn) => {
        this.emitEvent(this.f(event, this.nextIndex++));
    };

    constructor(
        protected source: Observable<TIn>,
        protected f: (event: TIn, index: number) => TOut,
    ) {
        super();
    }

    protected init() {
        this.source.observe(this.sourceObserver);
    }

    protected destroy() {
        this.source.unobserve(this.sourceObserver);
    }
}

/**
 * A mutable emitter.
 */
export class MutEmitter<TEvent> extends ObserverEmitter<TEvent> {
    /**
     * Emit an event to all observers of this emitter.
     *
     * @param event - The event to emit.
     */
    emit(event: TEvent): void {
        this.emitEvent(event);
    }

    /**
     * Create an immutable emitter that emits the same events as this emitter.
     *
     * @returns An immutable emitter.
     */
    asEmitter(): Emitter<TEvent> {
        return this.map(e => e);
    }
}

/**
 * An emitter that repeatedly emits events with a fixed time delay between
 * each event
 */
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

    /**
     * Start the interval if not already started. If there aren't currently any
     * observers the interval won't start until observed.
     */
    start() {
        this.started = true;
        if (this.observed) {
            this.set();
        }
    }

    /**
     * Stop the interval.
     */
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
