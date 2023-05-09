// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

export type PropertyValue<T> = T extends Property<infer TValue> ? TValue : never;

export type PropertyObserver<T> = (newValue: T) => any;


type PropertyProxyObject<T> = T extends {} ? {
    [TKey in keyof T]-?: Property<T[TKey]>;
} : any;

export abstract class Property<T> {
    abstract get value(): T;
    abstract observe(observer: PropertyObserver<T>): () => void;
    abstract unobserve(observer: PropertyObserver<T>): void;

    getAndObserve(observer: PropertyObserver<T>): () => void {
        observer(this.value);
        return this.observe(observer);
    }

    map<T2>(f: (value: T) => T2): Property<T2> {
        return new MappingProperty(this, f);
    }

    mapDefined<T2>(f: (value: NonNullable<T>) => T2): Property<T2|undefined> {
        return new MappingProperty(this, value => value != undefined ? f(value!) : undefined);
    }

    flatMap<T2>(f: (value: T) => Property<T2>): Property<T2> {
        return new FlatMappingProperty(this, f);
    }

    get not(): Property<boolean> {
        return this.map(x => !x);
    }

    get defined(): Property<boolean> {
        return this.map(x => x != undefined);
    }

    get undefined(): Property<boolean> {
        return this.map(x => x == undefined);
    }

    eq<T2 extends T|undefined>(other: Property<T2>|T2): Property<boolean> {
        if (other instanceof Property) {
            return zipWith([this, other], (x, y) => x === y);
        } else {
            return this.map(x => x === other);
        }
    }

    and<T2>(other: Property<T2>): Property<T2|false> {
        return this.flatMap(value => {
            if (value) {
                return other as Property<T2|false>;
            }
            return bind(false as false);
        });
    }

    or<T2>(other: Property<T2>): Property<T|T2> {
        return this.flatMap(value => {
            if (value) {
                return this as Property<T|T2>;
            }
            return other as Property<T|T2>;
        });
    }

    get props(): PropertyProxyObject<T> {
        return new Proxy({} as PropertyProxyObject<T>, {
            get: (_, name) => this.map(o => (o as any)[name]),
        });
    }

    orElse(alternative: NonNullable<T>): Property<NonNullable<T>> {
        return this.map(x => x != undefined ? x as NonNullable<T> : alternative);
    }

    await(onrejected?: (reason: any) => void): Property<Awaited<T>|undefined> {
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

export class MappingProperty<TIn, TOut> extends Property<TOut> {
    private observers: [PropertyObserver<TOut>, PropertyObserver<TIn>][] = [];

    constructor(protected source: Property<TIn>, protected f: (value: TIn) => TOut) {
        super();
    }

    get value(): TOut {
        return this.f(this.source.value);
    }

    observe(observer: PropertyObserver<TOut>): () => void {
        const sourceObserver = (newValue: TIn) => {
            observer(this.f(newValue));
        };
        this.source.observe(sourceObserver);
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<TOut>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.source.unobserve(this.observers[i][1]);
            this.observers.splice(i, 1);
        }
    }
}

interface FlatMapObserver<TIn, TOut> {
    outputObserver: PropertyObserver<TOut>;
    inputObserver: PropertyObserver<TIn>;
    intermediate: Property<TOut>;
}

export class FlatMappingProperty<TIn, TOut> extends Property<TOut> {
    private observers: FlatMapObserver<TIn, TOut>[] = [];

    constructor(protected source: Property<TIn>, protected f: (value: TIn) => Property<TOut>) {
        super();
    }

    get value(): TOut {
        return this.f(this.source.value).value;
    }

    observe(observer: PropertyObserver<TOut>): () => void {
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

    unobserve(observer: PropertyObserver<TOut>): void {
        const i = this.observers.findIndex(({outputObserver}) => outputObserver === observer);
        if (i >= 0) {
            this.observers[i].intermediate.unobserve(this.observers[i].outputObserver);
            this.source.unobserve(this.observers[i].inputObserver);
            this.observers.splice(i, 1);
        }
    }
}

export class ZippingProperty<T> extends Property<T> {
    private observers: [PropertyObserver<T>, PropertyObserver<any>][] = [];

    constructor(private sources: Property<any>[], private apply: () => T) {
        super();
    }

    get value(): T {
        return this.apply();
    }

    observe(observer: PropertyObserver<T>): () => void {
        const sourceObserver = () => {
            observer(this.apply());
        };
        this.sources.forEach(source => source.observe(sourceObserver));
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<T>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.sources.forEach(source => source.unobserve(this.observers[i][1]));
            this.observers.splice(i, 1);
        }
    }
}

export function zip<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>, e: Property<T5>, f: Property<T6>, g: Property<T7>, h: Property<T8>, i: Property<T9>, j: Property<T10>): Property<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
export function zip<T1, T2, T3, T4, T5, T6, T7, T8, T9>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>, e: Property<T5>, f: Property<T6>, g: Property<T7>, h: Property<T8>, i: Property<T9>): Property<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
export function zip<T1, T2, T3, T4, T5, T6, T7, T8>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>, e: Property<T5>, f: Property<T6>, g: Property<T7>, h: Property<T8>): Property<[T1, T2, T3, T4, T5, T6, T7, T8]>;
export function zip<T1, T2, T3, T4, T5, T6, T7>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>, e: Property<T5>, f: Property<T6>, g: Property<T7>): Property<[T1, T2, T3, T4, T5, T6, T7]>;
export function zip<T1, T2, T3, T4, T5, T6>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>, e: Property<T5>, f: Property<T6>): Property<[T1, T2, T3, T4, T5, T6]>;
export function zip<T1, T2, T3, T4, T5>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>, e: Property<T5>): Property<[T1, T2, T3, T4, T5]>;
export function zip<T1, T2, T3, T4>(a: Property<T1>, b: Property<T2>, c: Property<T3>, d: Property<T4>): Property<[T1, T2, T3, T4]>;
export function zip<T1, T2, T3>(a: Property<T1>, b: Property<T2>, c: Property<T3>): Property<[T1, T2, T3]>;
export function zip<T1, T2>(a: Property<T1>, b: Property<T2>): Property<[T1, T2]>;
export function zip<T>(... properties: Property<T>[]): Property<T[]> {
    return new ZippingProperty(properties, () => {
        return properties.map(p => p.value);
    });
}

export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>, Property<T5>, Property<T6>, Property<T7>, Property<T8>, Property<T9>, Property<T10>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8, i: T9, j: T10) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, T9, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>, Property<T5>, Property<T6>, Property<T7>, Property<T8>, Property<T9>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8, i: T9) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, T8, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>, Property<T5>, Property<T6>, Property<T7>, Property<T8>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7, h: T8) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, T7, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>, Property<T5>, Property<T6>, Property<T7>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6, g: T7) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, T4, T5, T6, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>, Property<T5>, Property<T6>], f: (a: T1, b: T2, c: T3, d: T4, e: T5, f: T6) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, T4, T5, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>, Property<T5>], f: (a: T1, b: T2, c: T3, d: T4, e: T5) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, T4, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>, Property<T4>], f: (a: T1, b: T2, c: T3, d: T4) => TOut): Property<TOut>;
export function zipWith<T1, T2, T3, TOut>(properties: [Property<T1>, Property<T2>, Property<T3>], f: (a: T1, b: T2, c: T3) => TOut): Property<TOut>;
export function zipWith<T1, T2, TOut>(properties: [Property<T1>, Property<T2>], f: (a: T1, b: T2) => TOut): Property<TOut>;
export function zipWith<T, TOut>(properties: Property<T>[], f: (... values: T[]) => TOut): Property<TOut> {
    return new ZippingProperty(properties, () => {
        return f(... properties.map(p => p.value));
    });
}

export abstract class ValueProperty<T> extends Property<T> {
    abstract set value(value: T);
    abstract update(mutator: (value: T) => void): void;

    bimap<T2>(encode: (value: T) => T2, decode: (value: T2) => T): ValueProperty<T2> {
        return new BimappingProperty(this, encode, decode);
    }
}

export class SettableValueProperty<T> extends ValueProperty<T> {
    private observers: Set<PropertyObserver<T>> = new Set;

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

    update(mutator: (value: T) => void): void {
        mutator(this._value);
        this.observers.forEach(observer => observer(this._value));
    }

    observe(observer: PropertyObserver<T>): () => void {
        this.observers.add(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<T>): void {
        this.observers.delete(observer);
    }
}

class BimappingProperty<T1, T2> extends ValueProperty<T2> {
    private observers: [PropertyObserver<T2>, PropertyObserver<T1>][] = [];

    constructor(
        protected source: ValueProperty<T1>,
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

    update(mutator: (value: T2) => void): void {
        const value = this.value;
        mutator(value);
        this.value = value;
    }

    observe(observer: PropertyObserver<T2>): () => void {
        const sourceObserver = (newValue: T1) => {
            observer(this.encode(newValue));
        };
        this.source.observe(sourceObserver);
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<T2>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.source.unobserve(this.observers[i][1]);
            this.observers.splice(i, 1);
        }
    }
}

export type Input<T> = Property<T>|T;

export function bind<T>(defaultValue: Input<T>, binding?: Input<T>): ValueProperty<T> {
    if (typeof binding === 'undefined') {
        if (defaultValue instanceof ValueProperty) {
            return defaultValue as ValueProperty<T>;
        } else if (defaultValue instanceof Property) {
            return new SettableValueProperty(defaultValue.value);
        } else {
            return new SettableValueProperty(defaultValue);
        }
    } else if (binding instanceof ValueProperty) {
        return binding as ValueProperty<T>;
    } else if (binding instanceof Property) {
        return new SettableValueProperty(binding.value);
    } else {
        return new SettableValueProperty(binding);
    }
}

export function ref<T>(): ValueProperty<T|undefined> {
    return bind<T|undefined>(undefined);
}
