// CSTK
// Copyright (c) 2024 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

export type CellValue<T> = T extends Cell<infer TValue> ? TValue : never;

export type CellObserver<T> = (newValue: T) => any;

type CellProxyObject<T> = T extends {} ? {
    [TKey in keyof T]-?: Cell<T[TKey]>;
} : unknown;

export abstract class Cell<T> {
    abstract get value(): T;
    abstract observe(observer: CellObserver<T>): () => void;
    abstract unobserve(observer: CellObserver<T>): void;

    getAndObserve(observer: CellObserver<T>): () => void {
        observer(this.value);
        return this.observe(observer);
    }

    map<T2>(f: (value: T) => T2): Cell<T2> {
        return new MappingCell(this, f);
    }

    mapDefined<T2>(f: (value: NonNullable<T>) => T2): Cell<T2|undefined> {
        return new MappingCell(this, value => value != undefined ? f(value!) : undefined);
    }

    flatMap<T2>(f: (value: T) => Cell<T2>): Cell<T2> {
        return new FlatMappingCell(this, f);
    }

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

    get not(): Cell<boolean> {
        return this.map(x => !x);
    }

    get defined(): Cell<boolean> {
        return this.map(x => x != undefined);
    }

    get undefined(): Cell<boolean> {
        return this.map(x => x == undefined);
    }

    eq<T2 extends T|undefined>(other: Cell<T2>|T2): Cell<boolean> {
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

class MappingCell<TIn, TOut> extends Cell<TOut> {
    private observers: [CellObserver<TOut>, CellObserver<TIn>][] = [];

    constructor(protected source: Cell<TIn>, protected f: (value: TIn) => TOut) {
        super();
    }

    get value(): TOut {
        return this.f(this.source.value);
    }

    observe(observer: CellObserver<TOut>): () => void {
        const sourceObserver = (newValue: TIn) => {
            observer(this.f(newValue));
        };
        this.source.observe(sourceObserver);
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<TOut>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.source.unobserve(this.observers[i][1]);
            this.observers.splice(i, 1);
        }
    }
}

interface FlatMapObserver<TIn, TOut> {
    outputObserver: CellObserver<TOut>;
    inputObserver: CellObserver<TIn>;
    intermediate: Cell<TOut>;
}

class FlatMappingCell<TIn, TOut> extends Cell<TOut> {
    private observers: FlatMapObserver<TIn, TOut>[] = [];

    constructor(protected source: Cell<TIn>, protected f: (value: TIn) => Cell<TOut>) {
        super();
    }

    get value(): TOut {
        return this.f(this.source.value).value;
    }

    observe(observer: CellObserver<TOut>): () => void {
        const obj: FlatMapObserver<TIn, TOut> = {
            outputObserver: observer,
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
        this.observers.push(obj);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<TOut>): void {
        const i = this.observers.findIndex(({outputObserver}) => outputObserver === observer);
        if (i >= 0) {
            this.observers[i].intermediate.unobserve(this.observers[i].outputObserver);
            this.source.unobserve(this.observers[i].inputObserver);
            this.observers.splice(i, 1);
        }
    }
}

export class ZippingCell<T> extends Cell<T> {
    private observers: [CellObserver<T>, CellObserver<any>][] = [];

    constructor(private sources: Cell<any>[], private apply: () => T) {
        super();
    }

    get value(): T {
        return this.apply();
    }

    observe(observer: CellObserver<T>): () => void {
        const sourceObserver = () => {
            observer(this.apply());
        };
        this.sources.forEach(source => source.observe(sourceObserver));
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<T>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.sources.forEach(source => source.unobserve(this.observers[i][1]));
            this.observers.splice(i, 1);
        }
    }
}

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

export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>, Cell<T8>, Cell<T9>, Cell<T10>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8, i: T9, j: T10) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, T9, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>, Cell<T8>, Cell<T9>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8, i: T9) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>, Cell<T8>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>, Cell<T7>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>, Cell<T6>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, T5, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>, Cell<T5>], f: (a: T1, b: T2, c: T3, d: T4, e: T5) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, T4, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>, Cell<T4>], f: (a: T1, b: T2, c: T3, d: T4) => TOut): Cell<TOut>;
export function zipWith<T1, T2, T3, TOut>(properties: [Cell<T1>, Cell<T2>, Cell<T3>], f: (a: T1, b: T2, c: T3) => TOut): Cell<TOut>;
export function zipWith<T1, T2, TOut>(properties: [Cell<T1>, Cell<T2>], f: (a: T1, b: T2) => TOut): Cell<TOut>;
export function zipWith<T, TOut>(properties: Cell<T>[], f: (... values: T[]) => TOut): Cell<TOut> {
    return new ZippingCell(properties, () => {
        return f(... properties.map(p => p.value));
    });
}

export abstract class MutCell<T> extends Cell<T> {
    abstract set value(value: T);
    abstract update<T2>(mutator: (value: T) => T2): T2;
    abstract updateDefined<T2>(mutator: (value: NonNullable<T>) => T2): T2 | undefined;

    bimap<T2>(encode: (value: T) => T2, decode: (value: T2) => T): MutCell<T2> {
        return new BimappingCell(this, encode, decode);
    }

    asCell(): Cell<T> {
        return this.map(x => x);
    }
}

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
    private observers: [CellObserver<T2>, CellObserver<T1>][] = [];

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
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: CellObserver<T2>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.source.unobserve(this.observers[i][1]);
            this.observers.splice(i, 1);
        }
    }
}

export type Input<T> = Cell<T> | T;

export function input<T>(input: Input<T>): Cell<T> {
    if (input instanceof Cell) {
        return input;
    }
    return new ConstCell(input);
}

export function cell<T>(initialValue: Input<T>): MutCell<T> {
    if (initialValue instanceof MutCell) {
        return initialValue as MutCell<T>;
    } else if (initialValue instanceof Cell) {
        return new MutCellImpl(initialValue.value);
    } else {
        return new MutCellImpl(initialValue);
    }
}

export function constant<T>(input: Input<T>): Cell<T> {
    if (input instanceof Cell) {
        return new ConstCell(input.value);
    }
    return new ConstCell(input);
}

export type RefCell<T> = Cell<T | undefined>;
export type MutRefCell<T> = MutCell<T | undefined>;

export function ref<T>(): MutRefCell<T> {
    return cell<T | undefined>(undefined);
}
