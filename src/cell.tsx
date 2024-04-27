// CSTK
// Copyright (c) 2024 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Observable, Observer } from './emitter';

/**
 * A utility type that given a cell type `Cell<TValue>` returns `TValue`.
 *
 * @example
 * ```tsx
 * type A = CellValue<Cell<number>>;
 * //   A = number
 * ```
 *
 * @typeParam T - The cell type.
 * @category Internals
 */
export type CellValue<T> = T extends Cell<infer TValue> ? TValue : never;

/**
 * Cell observer function type. Compatible with {@link Observer}.
 *
 * @param newValue - The new value of the cell.
 *
 * @category Cells
 */
export type CellObserver<T> = (newValue: T) => void;

/**
 * Type of the `props`-property of {@link Cell}. Turns the properties of a
 * cell's value into cells.
 *
 * @example
 * ```tsx
 * type A = CellProxyObject<{a: number, b: string, c?: string}>;
 * //   A = {a: Cell<number>, b: Cell<number>, c: Cell<string | undefined>}
 * ```
 *
 * @category Internals
 */
export type CellProxyObject<T> = T extends {} ? {
    [TKey in keyof T]-?: Cell<T[TKey]>;
} : any;

/**
 * An immutable cell. Has a value and can be observed for changes.
 *
 * @category Cells
 */
export abstract class Cell<T> implements Observable<T> {
    /**
     * Get the current value of the cell.
     *
     * @returns The value of the cell.
     */
    abstract get value(): T;

    abstract observe(observer: CellObserver<T>): () => void;
    abstract unobserve(observer: CellObserver<T>): void;

    /**
     * Get the cells current value and attach an observer. The observer function
     * is called once with the current value immediately upon calling this method.
     *
     * @param observer - The observer function to attach.
     * @returns A function that can be called to detach the observer.
     * Alternatively {@link unobserve} can be called.
     */
    getAndObserve(observer: CellObserver<T>): () => void {
        observer(this.value);
        return this.observe(observer);
    }

    /**
     * Create a cell that applies a function to the value of this cell.
     *
     * The function will be called whenever the value property of the resulting
     * cell is accessed. If the resulting cell is being observed, the function
     * will also be called once each time the value of this cell changes.
     *
     * @param f - The function to apply to the cell value.
     * @returns A cell.
     */
    map<T2>(f: (value: T) => T2): Cell<T2> {
        return new MappingCell(this, f);
    }

    /**
     * Create a cell that applies a function to the value of this cell, but only
     * when the value is not `null` or `undefined`.
     *
     * The function will be called whenever the value property of the resulting
     * cell is accessed. If the resulting cell is being observed, the function
     * will also be called once each time the value of this cell changes.
     *
     * @param f - The function apply to the cell value.
     * @returns A mapping cell.
     */
    mapDefined<T2>(f: (value: NonNullable<T>) => T2): Cell<T2|undefined> {
        return new MappingCell(this, value => value != undefined ? f(value!) : undefined);
    }

    /**
     * Create a cell that applies a function to the value of this cell. The
     * function must return a cell.
     *
     * @param f - The function apply to the cell value.
     * @returns A flat mapping cell.
     */
    flatMap<T2>(f: (value: T) => Cell<T2>): Cell<T2> {
        return new FlatMappingCell(this, f);
    }

    /**
     * Create a promise that resolves with the first non-null, non-undefined
     * value of this cell. If the value of this cell is not null or undefined
     * the method returns a resolved Promise with the value. 
     *
     * @returns A promise that resolves when the value of this cell is not null
     * or undefined.
     */
    toPromise(): Promise<NonNullable<T>> {
        if (this.value != undefined) {
            return Promise.resolve(this.value);
        }
        return new Promise((resolve) => {
            const observer = (value: T) => {
                if (value != undefined) {
                    this.unobserve(observer);
                    resolve(value);
                }
            };
            this.observe(observer);
        });
    }

    /**
     * Create a cell that negates the value of this cell using the `!` operator.
     *
     * @returns A negating cell.
     */
    get not(): Cell<boolean> {
        return this.map(x => !x);
    }

    /**
     * Create a cell the value of which is true if this cell's value is not null
     * or undefined, false otherwise.
     *
     * @returns A cell.
     */
    get defined(): Cell<boolean> {
        return this.map(x => x != undefined);
    }

    /**
     * Create a cell the value of which is true if this cell's value is null
     * or undefined, false otherwise.
     *
     * @returns A cell.
     */
    get undefined(): Cell<boolean> {
        return this.map(x => x == undefined);
    }

    /**
     * Create a cell tthe value of which is true if this cell's value is equal
     * to the given value or the value of the given cell, false otherwise.
     *
     * @param other - A value or cell to compare the value of this cell to.
     * @returns A cell.
     */
    eq<T2 extends T | undefined>(other: Cell<T2> | T2): Cell<boolean> {
        if (other instanceof Cell) {
            return zipWith([this, other], (x, y) => x === y);
        } else {
            return this.map(x => x === other);
        }
    }

    and<T2>(other: Cell<T2>): Cell<T2 | false> {
        return this.flatMap(value => {
            if (value) {
                return other as Cell<T2|false>;
            }
            return cell(false as false);
        });
    }

    or<T2>(other: Cell<T2>): Cell<T|T2> {
        return this.flatMap(value => {
            if (value) {
                return this as Cell<T|T2>;
            }
            return other as Cell<T|T2>;
        });
    }

    get props(): CellProxyObject<T> {
        return new Proxy({} as any, {
            get: (_, name) => this.map(o => (o as any)[name]),
        });
    }

    orElse(alternative: NonNullable<T>): Cell<NonNullable<T>> {
        return this.map(x => x != undefined ? x as NonNullable<T> : alternative);
    }

    await(onrejected?: (reason: unknown) => void): Cell<Awaited<T> | undefined> {
        const result = ref<Awaited<T>>();
        let previousPromise: T;
        return this.flatMap(promise => {
            if (promise !== previousPromise && promise instanceof Promise) {
                (promise as Promise<Awaited<T>>).then(value => result.value = value, onrejected);
                previousPromise = promise;
            }
            return result;
        });
    }

    /**
     * Create a cell from an existing observable (e.g. an {@link Emitter}) and
     * an initial value.
     *
     * **N.B.** Unless observed, the value of the resulting cell will not
     * update when the observable emits events.
     *
     * @param observable - An observable.
     * @param initialValue - The initial value of the cell.
     * @returns A cell.
     */
    static from<T>(observable: Observable<T>, initialValue: T): Cell<T> {
        return new ObservingCell(observable, initialValue);
    }
}

abstract class ObserverCell<T> extends Cell<T> {
    private observers: Set<CellObserver<T>> = new Set;

    protected init(): void {
    }

    protected destroy(): void {
    }

    protected emitValue(value: T) {
        this.observers.forEach(observer => observer(value));
    }

    protected get observed(): boolean {
        return !!this.observers.size;
    }

    observe(observer: CellObserver<T>): () => void {
        if (!this.observers.size) {
            this.init();
        }
        this.observers.add(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<T>): void {
        this.observers.delete(observer);
        if (!this.observers.size) {
            this.destroy();
        }
    }
}

class ObservingCell<T> extends ObserverCell<T> {
    private observableObserver: Observer<T> = value => {
        this._value = value;
        this.emitValue(value);
    };

    constructor(
        private observable: Observable<T>,
        private _value: T,
    ) {
        super();
    }

    get value(): T {
        return this._value;
    }

    protected init() {
        this.observable.observe(this.observableObserver);
    }

    protected destroy() {
        this.observable.unobserve(this.observableObserver);
    }
}

class ConstCell<T> extends Cell<T> {
    constructor(private _value: T) {
        super();
    }

    get value(): T {
        return this._value;
    }
    observe(_: CellObserver<T>): () => void {
        return () => {};
    }
    unobserve(_: CellObserver<T>): void {
    }
}

class MappingCell<TIn, TOut> extends ObserverCell<TOut> {
    private sourceObserver: CellObserver<TIn> = value => {
        this.emitValue(this.f(value));
    };

    constructor(protected source: Cell<TIn>, protected f: (value: TIn) => TOut) {
        super();
    }

    get value(): TOut {
        return this.f(this.source.value);
    }

    protected init() {
        this.source.observe(this.sourceObserver);
    }

    protected destroy() {
        this.source.unobserve(this.sourceObserver);
    }
}

interface FlatMapObserver<TIn, TOut> {
    inputObserver: CellObserver<TIn>;
    intermediate: Cell<TOut>;
}

class FlatMappingCell<TIn, TOut> extends Cell<TOut> {
    private observers = new Map<CellObserver<TOut>, FlatMapObserver<TIn, TOut>>;

    constructor(protected source: Cell<TIn>, protected f: (value: TIn) => Cell<TOut>) {
        super();
    }

    get value(): TOut {
        return this.f(this.source.value).value;
    }

    observe(observer: CellObserver<TOut>): () => void {
        const obj: FlatMapObserver<TIn, TOut> = {
            intermediate: this.f(this.source.value),
            inputObserver: () => {},
        };
        obj.intermediate.observe(observer);
        obj.inputObserver = (newValue: TIn) => {
            obj.intermediate.unobserve(observer);
            obj.intermediate = this.f(newValue);
            obj.intermediate.observe(observer);
            observer(obj.intermediate.value);
        };
        this.source.observe(obj.inputObserver);
        this.observers.set(observer, obj);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<TOut>): void {
        const obj = this.observers.get(observer);
        if (obj) {
            obj.intermediate.unobserve(observer);
            this.source.unobserve(obj.inputObserver);
            this.observers.delete(observer);
        }
    }
}

class ZippingCell<T> extends ObserverCell<T> {
    private  sourceObserver = () => {
        this.emitValue(this.apply());
    };

    constructor(private sources: Cell<any>[], private apply: () => T) {
        super();
    }

    get value(): T {
        return this.apply();
    }

    protected init() {
        this.sources.forEach(source => source.observe(this.sourceObserver));
    }

    protected destroy() {
        this.sources.forEach(source => source.unobserve(this.sourceObserver));
    }
}

/**
 * @category Cells
 */
export function zip<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>, e: Cell<T5>, f: Cell<T6>, g: Cell<T7>, h: Cell<T8>, i: Cell<T9>, j: Cell<T10>): Cell<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
export function zip<T1, T2, T3, T4, T5, T6, T7, T8, T9>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>, e: Cell<T5>, f: Cell<T6>, g: Cell<T7>, h: Cell<T8>, i: Cell<T9>): Cell<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
export function zip<T1, T2, T3, T4, T5, T6, T7, T8>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>, e: Cell<T5>, f: Cell<T6>, g: Cell<T7>, h: Cell<T8>): Cell<[T1, T2, T3, T4, T5, T6, T7, T8]>;
export function zip<T1, T2, T3, T4, T5, T6, T7>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>, e: Cell<T5>, f: Cell<T6>, g: Cell<T7>): Cell<[T1, T2, T3, T4, T5, T6, T7]>;
export function zip<T1, T2, T3, T4, T5, T6>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>, e: Cell<T5>, f: Cell<T6>): Cell<[T1, T2, T3, T4, T5, T6]>;
export function zip<T1, T2, T3, T4, T5>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>, e: Cell<T5>): Cell<[T1, T2, T3, T4, T5]>;
export function zip<T1, T2, T3, T4>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>, d: Cell<T4>): Cell<[T1, T2, T3, T4]>;
export function zip<T1, T2, T3>(a: Cell<T1>, b: Cell<T2>, c: Cell<T3>): Cell<[T1, T2, T3]>;
export function zip<T1, T2>(a: Cell<T1>, b: Cell<T2>): Cell<[T1, T2]>;
export function zip<T>(... properties: Cell<T>[]): Cell<T[]> {
    return new ZippingCell(properties, () => {
        return properties.map(p => p.value);
    });
}

/**
 * @category Cells
 */
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>, Cell<T8>, Cell<T9>, Cell<T10>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8, i: T9, j: T10) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, T9, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>, Cell<T8>, Cell<T9>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8, i: T9) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>, Cell<T8>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>], f: (a: T1, b: T2, c: T3, d: T4, e: T5) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>], f: (a: T1, b: T2, c: T3, d: T4) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>], f: (a: T1, b: T2, c: T3) => TOut): Cell<TOut>;
export function zipWith<T1, T2, TOut>(properties: [Cell<T1>, Cell<T2>], f: (a: T1, b: T2) => TOut): Cell<TOut>;
export function zipWith<T, TOut>(properties: Cell<T>[], f: (... values: T[]) => TOut): Cell<TOut>;
export function zipWith<T, TOut>(properties: Cell<T>[], f: (... values: T[]) => TOut): Cell<TOut> {
    return new ZippingCell(properties, () => {
        return f(... properties.map(p => p.value));
    });
}

const autoDependencies: Cell<unknown>[] = [];

class ComputingCell<T> extends ObserverCell<T> {
    private sourceObserver = () => {
        this.emitValue(this.value);
    };

    constructor(private sources: Set<Cell<any>>, private computation: () => T) {
        super();
    }

    get value(): T {
        autoDependencies.splice(0);
        const value = this.computation();
        autoDependencies.splice(0).forEach(cell => {
            if (!this.sources.has(cell)) {
                this.sources.add(cell);
                if (this.observed) {
                    cell.observe(this.sourceObserver);
                }
            }
        });
        return value;
    }

    protected init(): void {
        this.sources.forEach(source => source.observe(this.sourceObserver));
    }

    protected destroy(): void {
        this.sources.forEach(source => source.unobserve(this.sourceObserver));
    }
}

/**
 * Utility function for creating computational cells that automatically track
 * dependencies. Use {@link zipWith} if you want to explicitly specify
 * dependencies. The same function is used both to unwrap cells and to create
 * computed cells.
 *
 * @param cell - A cell to track and unwrap.
 * @returns The value of the cell.
 * @experimental
 * @category Cells
 */
export function $<T>(cell: Cell<T>): T;
/**
 * Create a computed cell. Do not use `cell.value` inside the computation,
 * always us `$(cell)` to unwrap cells to properly track dependencies.
 *
 * @example
 * In the following example `c` and `d` are equivalent:
 * ```tsx
 * const a = cell(1);
 * const b = cell(2);
 * const c = $(() => $(a) + $(b));
 * const d = zipWith([a, b], (a, b) => a + b);
 * ```
 *
 * @param computation - A function that can unwrap cells using `$(cell)` and
 * compute a resulting value.
 * @returns A cell that computes its value based on the provided computation
 * function.
 * @category Cells
 */
export function $<T>(computation: (() => T)): Cell<T>;
export function $<T>(computation: Cell<T> | (() => T)): T | Cell<T> {
    if (computation instanceof Cell) {
        autoDependencies.push(computation);
        return computation.value;
    } else {
        autoDependencies.splice(0);
        computation();
        return new ComputingCell(new Set(autoDependencies.splice(0)), computation);
    }
}

/**
 * A mutable cell.
 *
 * @category Cells
 */
export abstract class MutCell<T> extends Cell<T> {
    /**
     * Set the cell's value. This emits the new value to all observers.
     *
     * @param value - The new value.
     */
    abstract set value(value: T);

    /**
     * Update the cell's value via a function.
     *
     * @example
     * ```tsx
     * const a = cell({b: 5});
     * a.update(a => a.b = 10);
     * expect(a.value.b).toBe(10);
     * ```
     *
     * @param mutator - A function that modifies the value of this cell.
     * @returns If the `mutator` function returns a value, that value is
     * returned by `update` as well.
     */
    abstract update<T2>(mutator: (value: T) => T2): T2;

    /**
     * Same as {@link update} but the function is only applied if the value of
     * the cell is not null or undefined.
     */
    abstract updateDefined<T2>(mutator: (value: NonNullable<T>) => T2): T2 | undefined;

    /**
     * Create a two-way binding that modified values in both directions. The
     * resulting cell is mutable and any modification of it will also result in
     * an update of this cell.
     *
     * @example
     * ```tsx
     * const a = bind(1);
     * const b = a.bimap(x => x + 1, y => y - 1);
     * 
     * expect(b.value).toBe(2);
     *
     * a.value = 5;
     * expect(b.value).toBe(6);
     *
     * b.value = 3;
     * expect(a.value).toBe(2);
     * ```
     *
     * @param encode - Applied to the value of this cell to get the value of the
     * resulting cell.
     * @param decode - Applied to the value of the resulting cell to update the
     * value of this cell.
     */
    bimap<T2>(encode: (value: T) => T2, decode: (value: T2) => T): MutCell<T2> {
        return new BimappingCell(this, encode, decode);
    }

    /**
     * Convert this cell to an immutable cell. The resulting will no longer be
     * an instance of `MutCell` but will still update its value whenever this
     * cell is updated.
     */
    asCell(): Cell<T> {
        return this.map(x => x);
    }
}

/**
 * @internal
 * @category Internals
 */
export class MutCellImpl<T> extends MutCell<T> {
    private observers: Set<CellObserver<T>> = new Set;

    constructor(protected _value: T) {
        super();
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        this._value = value;
        this.observers.forEach(observer => observer(value));
    }

    update<T2>(mutator: (value: T) => T2): T2 {
        const result = mutator(this._value);
        this.observers.forEach(observer => observer(this._value));
        return result;
    }

    updateDefined<T2>(mutator: (value: NonNullable<T>) => T2): T2 | undefined {
        if (this._value !== undefined && this._value !== null) {
            const result = mutator(this._value);
            this.observers.forEach(observer => observer(this._value));
            return result;
        }
        return undefined;
    }

    observe(observer: CellObserver<T>): () => void {
        this.observers.add(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<T>): void {
        this.observers.delete(observer);
    }
}

class BimappingCell<T1, T2> extends MutCell<T2> {
    private observers = new Map<CellObserver<T2>, CellObserver<T1>>;

    constructor(
        protected source: MutCell<T1>,
        protected encode: (value: T1) => T2,
        protected decode: (value: T2) => T1,
    ) {
        super();
    }

    get value(): T2 {
        return this.encode(this.source.value);
    }

    set value(value: T2) {
        this.source.value = this.decode(value);
    }

    update<T3>(mutator: (value: T2) => T3): T3 {
        const value = this.value;
        const result = mutator(value);
        this.value = value;
        return result;
    }

    updateDefined<T3>(mutator: (value: NonNullable<T2>) => T3): T3 | undefined {
        const value = this.value;
        if (value) {
            const result = mutator(value);
            this.value = value;
            return result;
        }
        return undefined;
    }

    observe(observer: CellObserver<T2>): () => void {
        const sourceObserver = (newValue: T1) => {
            observer(this.encode(newValue));
        };
        this.source.observe(sourceObserver);
        this.observers.set(observer, sourceObserver);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<T2>): void {
        const sourceObserver = this.observers.get(observer);
        if (sourceObserver) {
            this.source.unobserve(sourceObserver);
            this.observers.delete(observer);
        }
    }
}

/**
 * A type that is either a cell containing `T` or `T` itself.
 *
 * @category Cells
 */
export type Input<T> = Cell<T> | T;

/**
 * Create an input cell from an `Input`.
 *
 * @category Cells
 */
export function input<T>(input: Input<T>): Cell<T>;
export function input<T>(input: Input<T> | undefined, defaultValue: T): Cell<T>;
export function input<T>(input: Input<T>, defaultValue?: T): Cell<T> {
    if ((input === undefined || input === null) && defaultValue) {
        return new ConstCell(defaultValue);
    } else if (input instanceof Cell) {
        return input;
    }
    return new ConstCell(input);
}

/**
 * Create a mutable cell.
 *
 * @param initialValue - The initial value of the cell.
 * @category Cells
 */
export function cell<T>(initialValue: Input<T>): MutCell<T> {
    if (initialValue instanceof MutCell) {
        return initialValue as MutCell<T>;
    } else if (initialValue instanceof Cell) {
        return new MutCellImpl(initialValue.value);
    } else {
        return new MutCellImpl(initialValue);
    }
}

/**
 * Create a constant immutable cell.
 *
 * @param input - The value of the cell.
 * @category Cells
 */
export function constant<T>(input: Input<T>): Cell<T> {
    if (input instanceof Cell) {
        return new ConstCell(input.value);
    }
    return new ConstCell(input);
}

/**
 * A cell the value of which can be undefined.
 *
 * @category Cells
 */
export type RefCell<T> = Cell<T | undefined>;

/**
 * A mutable cell the value of which can be undefined.
 *
 * @category Cells
 */
export type MutRefCell<T> = MutCell<T | undefined>;

/**
 * Create a cell without a value.
 *
 * @category Cells
 */
export function ref<T>(): MutRefCell<T> {
    return cell<T | undefined>(undefined);
}
