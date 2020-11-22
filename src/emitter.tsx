
export type Observer<T> = (event: T) => boolean | Promise<void> | void;

export type EmitterObserver<T> = T extends Emitter<infer TValue> ? Observer<TValue> : never;

export class Emitter<T> {
    private observers: Observer<T>[] = [];

    emit(event: T): void {
        for (let observer of this.observers) {
            if (observer(event) === false) {
                return;
            }
        }
    }

    observe(observer: Observer<T>): () => void {
        this.observers.push(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: Observer<T>): void {
        this.observers = this.observers.filter(o => o !== observer);
    }

    map<S>(f: (event: T) => S): Emitter<S> {
        return new MapEmitter(this, f);
    }

    next(): Promise<T> {
        return new Promise(resolve => {
            const unobserve = this.observe(x => {
                unobserve();
                resolve(x);
            });
        });
    }
}

export class MapEmitter<T1, T2> extends Emitter<T2> {
    constructor(private source: Emitter<T1>, private f: (event: T1) => T2) {
        super();
    }

    observe(observer: Observer<T2>): () => void {
        return this.source.observe(event => observer(this.f(event)));
    }
}

export class DomEmitter<TElem extends HTMLElement, TName extends keyof HTMLElementEventMap> extends Emitter<HTMLElementEventMap[TName]> {
    private unobservers: [Observer<HTMLElementEventMap[TName]>, () => void][] = [];

    constructor(
        private elem: TElem,
        private name: TName,
    ) {
        super();
    }

    observe(observer: Observer<HTMLElementEventMap[TName]>): () => void {
        this.elem.addEventListener(this.name, observer);
        const unobserver = () => {
            this.unobservers = this.unobservers.filter(u => u[0] !== observer);
            this.elem.removeEventListener(this.name, observer);
        };
        this.unobservers.push([observer, unobserver]);
        return unobserver;
    }

    unobserve(observer: Observer<HTMLElementEventMap[TName]>): void {
        const unobserver = this.unobservers.find(u => u[0] === observer);
        if (unobserver) {
            unobserver[1]();
        }
    }
}

export type PropertyValue<T> = T extends Property<infer TValue> ? TValue : never;

export class Property<T> {
    private observers: Observer<T>[] = [];
    private binding: Property<T>[] = [this];

    constructor(protected _value: T, private setter: ((value: T) => void)|null = null) {
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        if (this._value === value) {
            return;
        }
        for (let prop of this.binding) {
            prop._value = value;
            if (prop.setter) {
                prop.setter(value);
            }
            for (let observer of prop.observers) {
                if (observer(value) === false) {
                    return;
                }
            }
        }
    }

    bind(prop: Property<T>) {
        if (prop.binding === this.binding) {
            return;
        }
        prop.value = this.value;
        for (let boundProp of prop.binding) {
            this.binding.push(boundProp);
            boundProp.binding = this.binding;
        }
    }

    getAndObserve(observer: Observer<T>): () => void {
        observer(this._value);
        return this.observe(observer);
    }

    observe(observer: Observer<T>): () => void {
        this.observers.push(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: Observer<T>): void {
        this.observers = this.observers.filter(o => o !== observer);
    }

    map<T2>(f: (value: T) => T2): Property<T2> {
        const prop = new Property(f(this._value));
        this.observe(value => {
            prop.value = f(value);
        });
        return prop;
    }

    flatMap<T2>(f: (value: T) => Property<T2>): Property<T2> {
        let other = f(this._value);
        const prop = new Property(other.value);
        let unobserver = other.observe(value => {
            prop.value = value;
        });
        this.observe(value => {
            unobserver();
            other = f(value);
            prop.value = other.value;
            unobserver = other.observe(value => {
                prop.value = value;
            });
        });
        return prop;
    }
}
