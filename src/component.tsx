function appendChildren(element: HTMLElement, children: JSX.ElementChild[], context: JSX.Context): void {
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (typeof child === 'number') {
            element.appendChild(document.createTextNode('' + child));
        } else if (Array.isArray(child)) {
            appendChildren(element, child, context);
        } else if (child instanceof Property) {
            const text = document.createTextNode('' + child.value);
            const unobserve = child.observe((value: string|number) => {
                text.textContent = '' + value;
            });
            context.onDestroy(() => unobserve());
            element.appendChild(text);
        } else if (child instanceof Node) {
            element.appendChild(child);
        } else {
            apply(child, context).forEach(child => {
                element.appendChild(child);
            });
        }
    });
}

export type ComponentProps<T> = T & {
    children?: JSX.ElementChild|JSX.ElementChild[],
};
export type Component<T = {}> = (props: ComponentProps<T>, context: JSX.Context) => JSX.Element;

type ElementAttributes<T> = Record<string, string|number|boolean|Property<string>|Property<number>|Property<boolean>|EventListenerOrEventListenerObject> & {
    ref?: ValueProperty<T|undefined>,
};

export function createElement<TElem extends keyof HTMLElementTagNameMap>(name: TElem, properties: ElementAttributes<HTMLElementTagNameMap[TElem]>, ... children: JSX.ElementChild[]): JSX.Element;
export function createElement<T extends {}>(name: Component<T>, properties: T, ... children: JSX.ElementChild[]): JSX.Element;
export function createElement<TElem extends keyof HTMLElementTagNameMap, TProps extends {}>(name: TElem|Component<TProps>, properties: TProps & ElementAttributes<HTMLElementTagNameMap[TElem]>, ... children: JSX.ElementChild[]): JSX.Element {
    if (typeof name === 'string') {
        return context => {
            const e = document.createElement(name);
            if (properties) {
                for (let prop in properties) {
                    if (properties.hasOwnProperty(prop)) {
                        const value = properties[prop];
                        if (prop.startsWith('on')) {
                            const finalName = prop.replace(/Capture$/, '');
                            const useCapture = prop !== finalName;
                            const eventName = finalName.toLowerCase().substring(2);
                            e.addEventListener(eventName, value as EventListenerOrEventListenerObject, useCapture);
                            context.onDestroy(() => {
                                e.removeEventListener(eventName, value as EventListenerOrEventListenerObject);
                            });
                        } else if (prop === 'style') {
                            if (value instanceof Property) {
                                context.onDestroy(value.getAndObserve((value: string|number|boolean|object) => {
                                    if (typeof value === 'object') {
                                        for (let key in value) {
                                            if (value.hasOwnProperty(key)) {
                                                e.style[key as any] = (value as any)[key as any] as any;
                                            }
                                        }
                                    } else {
                                        e.setAttribute('style', '' + value);
                                    }
                                }));
                            } else if (typeof value === 'object') {
                                for (let key in value) {
                                    if (value.hasOwnProperty(key)) {
                                        const declValue = (value as any)[key as any] as any;
                                        if (declValue instanceof Property) {
                                            context.onDestroy(declValue.getAndObserve((declValue: any) => {
                                                e.style[key as any] = declValue;
                                            }));
                                        } else {
                                            e.style[key as any] = declValue;
                                        }
                                    }
                                }
                            } else {
                                e.setAttribute('style', '' + value);
                            }
                        } else if (prop === 'class') {
                            if (value instanceof Property) {
                                context.onDestroy(value.getAndObserve((value: string|number|boolean|object) => {
                                    e.setAttribute('class', '' + value);
                                }));
                            } else if (typeof value === 'object') {
                                for (let key in value) {
                                    if (value.hasOwnProperty(key)) {
                                        const declValue = (value as any)[key as any] as any;
                                        if (declValue instanceof Property) {
                                            context.onDestroy(declValue.getAndObserve((declValue: any) => {
                                                if (declValue) {
                                                    e.classList.add(key as any);
                                                } else {
                                                    e.classList.remove(key as any);
                                                }
                                            }));
                                        } else if (declValue) {
                                            e.classList.add(key as any);
                                        } else {
                                            e.classList.remove(key as any);
                                        }
                                    }
                                }
                            } else {
                                e.setAttribute('class', '' + value);
                            }
                        } else if (prop === 'ref') {
                            if (value instanceof ValueProperty) {
                                value.value = e;
                            }
                        } else if (value instanceof Property) {
                            const observer = (value: string|number|boolean) => {
                                if (value === true) {
                                    e.setAttribute(prop, prop);
                                } else if (value || value === 0) {
                                    e.setAttribute(prop, '' + value)
                                } else {
                                    e.removeAttribute(prop);
                                }
                            };
                            value.getAndObserve(observer);
                            context.onDestroy(() => {
                                value.unobserve(observer);
                            });
                        } else if (value === true) {
                            e.setAttribute(prop, prop);
                        } else if (value || value === 0) {
                            e.setAttribute(prop, '' + value);
                        }
                    }
                }
            }
            appendChildren(e, children, context);
            return e;
        };
    } else {
        if (children.length === 1) {
            return context => name({... properties, children: children[0]}, context)(context);
        }
        return context => name({... properties, children}, context)(context);
    }
}

export type PropertyValue<T> = T extends Property<infer TValue> ? TValue : never;

export type Observer<T> = (event: T) => any;

export type PropertyObserver<T> = (newValue: T) => any;

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

    next(): Promise<T> {
        return new Promise(resolve => {
            const unobserve = this.observe(x => {
                unobserve();
                resolve(x);
            });
        });
    }
}

type PropertyProxyObject<T> = T extends {} ? {
    [TKey in keyof T]: Property<T[TKey]>;
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
        return this.flatMap(promise => {
            const result = ref<Awaited<T>>();
            if (promise instanceof Promise) {
                (promise as Promise<Awaited<T>>).then(value => result.value = value, onrejected);
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


export class ValueProperty<T> extends Property<T> {
    private observers: PropertyObserver<T>[] = [];

    constructor(protected _value: T) {
        super();
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        this.set(value);
    }

    set(value: T) {
        this._value = value;
        for (let observer of this.observers) {
            observer(value);
        }
    }

    observe(observer: PropertyObserver<T>): () => void {
        this.observers.push(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<T>): void {
        const i = this.observers.findIndex(o => o === observer);
        if (i >= 0) {
            this.observers.splice(i, 1);
        }
    }
}

export type Input<T> = Property<T>|T;

export function bind<T>(defaultValue: Input<T>, binding?: Input<T>): ValueProperty<T> {
    if (typeof binding === 'undefined') {
        if (defaultValue instanceof ValueProperty) {
            return defaultValue;
        } else if (defaultValue instanceof Property) {
            return new ValueProperty(defaultValue.value);
        } else {
            return new ValueProperty(defaultValue);
        }
    } else if (binding instanceof ValueProperty) {
        return binding;
    } else if (binding instanceof Property) {
        return new ValueProperty(binding.value);
    } else {
        return new ValueProperty(binding);
    }
}

export function ref<T>(): ValueProperty<T|undefined> {
    return bind<T|undefined>(undefined);
}

export function flatten(elements: JSX.Element[]|JSX.Element): JSX.Element {
    if (Array.isArray(elements)) {
        return context => {
            const result: Node[] = [];
            elements.forEach(element => {
                const output = element(context);
                if (Array.isArray(output)) {
                    output.forEach(e => result.push(e));
                } else {
                    result.push(output);
                }
            });
            return result;
        };
    }
    return elements;
}

export function apply(elements: JSX.Element[]|JSX.Element, context: JSX.Context): Node[] {
    const result: Node[] = [];
    if (Array.isArray(elements)) {
        elements.forEach(element => {
            const output = element(context);
            if (Array.isArray(output)) {
                output.forEach(e => result.push(e));
            } else {
                result.push(output);
            }
        });
    } else {
        const output = elements(context);
        if (Array.isArray(output)) {
            output.forEach(e => result.push(e));
        } else {
            result.push(output);
        }
    }
    return result;
}

export class Context implements JSX.Context {
    private initialized = false;
    private destroyed = false;
    private initializers: (() => void)[] = [];
    private destructors: (() => void)[] = [];

    onInit(initializer: () => void): void {
        this.initializers.push(initializer);
    }

    onDestroy(destructor: () => void): void {
        this.destructors.push(destructor);
    }

    init() {
        if (!this.initialized) {
            this.initializers.forEach(f => f());
            this.initialized = true;
        }
    }

    destroy() {
        if (this.initialized && !this.destroyed) {
            this.destructors.forEach(f => f());
            this.destroyed = true;
        }
    }
}

export function Show(props: {
    children: JSX.Element[]|JSX.Element,
    when: Property<any>,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Show>');
        const childNodes: Node[] = [];
        let previous: boolean|undefined;
        let subcontext: Context|undefined;
        const observer = (condition: boolean) => {
            condition = !!condition;
            if (condition === previous) {
                return;
            }
            if (condition) {
                if (!marker.parentElement) {
                    return; // shouldn't be possible
                }
                const parent = marker.parentElement;
                subcontext = new Context();
                apply(props.children, subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            } else if (previous && subcontext) {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                subcontext.destroy();
            }
            previous = condition;
        };
        context.onInit(() => {
            props.when.getAndObserve(observer);
        });
        context.onDestroy(() => {
            props.when.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Deref<T>(props: {
    children: (value: Property<T>) => JSX.Element
    ref: Property<T|undefined>,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Deref>');
        const childNodes: Node[] = [];
        let property: ValueProperty<T>|undefined;
        let subcontext: Context|undefined;
        const observer = (value: T|undefined) => {
            if (value) {
                if (!property) {
                    property = bind(value);
                } else {
                    property.value = value;
                }
                if (subcontext) {
                    return;
                }
                if (!marker.parentElement) {
                    return; // shouldn't be possible
                }
                const parent = marker.parentElement;
                subcontext = new Context();
                apply(props.children(property), subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            } else if (subcontext) {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                subcontext.destroy();
                subcontext = undefined;
            }
        };
        context.onInit(() => {
            props.ref.getAndObserve(observer);
        });
        context.onDestroy(() => {
            props.ref.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Dynamic<T>(props: T & {
    component: Property<Component<T>|undefined>,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Dynamic>');
        const childNodes: Node[] = [];
        let subcontext: Context|undefined;
        const observer = (component?: Component<T>) => {
            if (subcontext) {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                subcontext.destroy();
            }
            if (component) {
                if (!marker.parentElement) {
                    return; // shouldn't be possible
                }
                const parent = marker.parentElement;
                subcontext = new Context();
                apply(component(props, subcontext), subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            }
        };
        context.onInit(() => {
            props.component.getAndObserve(observer);
        });
        context.onDestroy(() => {
            props.component.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}


export function Style(props: {
    children: JSX.Element[]|JSX.Element
} & {
    [TKey in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[TKey]|Property<CSSStyleDeclaration[TKey]>
}): JSX.Element {
    return context => {
        const children = apply(props.children, context);
        (Array.isArray(children) ? children : [children]).forEach(child => {
            if (!(child instanceof HTMLElement)) {
                return;
            }
            for (let key in props) {
                if (props.hasOwnProperty(key) && key !== 'children') {
                    const value = props[key];
                    if (value instanceof Property) {
                        value.getAndObserve(v => child.style[key] = v);
                    } else if (value) {
                        child.style[key] = value;
                    }
                }
            }
        });
        return children;
    };
}

export function handle<TEvent>(f?: (ev: TEvent) => void): (ev: TEvent) => void {
    return f || (() => {});
}

export function mount(container: HTMLElement, ... elements: JSX.Element[]): () => void {
    const context = new Context();
    apply(elements, context).forEach(e => container.appendChild(e));
    context.init();
    return () => {
        container.innerHTML = '';
        context.destroy();
    };
}

export function Fragment({children}: {children: JSX.Element[]|JSX.Element}) {
    return flatten(children);
}

declare global {
    namespace JSX {
        interface Context {
            onInit(initializer: () => void): void;
            onDestroy(destructor: () => void): void;
        }

        type Element = (context: Context) => Node|Node[];

        interface ElementAttributesProperty {
            props: any;
        }
        interface ElementChildrenAttribute {
            children: any;
        }

        type ElementChild = HTMLElement|string|number|Property<string>|Property<number>|Element|ElementChild[];

        type EventHandler<TEvent extends Event> = (this: HTMLElement, ev: TEvent) => void;

        type ClipboardEventHandler = EventHandler<ClipboardEvent>;
        type CompositionEventHandler = EventHandler<CompositionEvent>;
        type DragEventHandler = EventHandler<DragEvent>;
        type FocusEventHandler = EventHandler<FocusEvent>;
        type KeyboardEventHandler = EventHandler<KeyboardEvent>;
        type MouseEventHandler = EventHandler<MouseEvent>;
        type TouchEventHandler = EventHandler<TouchEvent>;
        type UIEventHandler = EventHandler<UIEvent>;
        type WheelEventHandler = EventHandler<WheelEvent>;
        type AnimationEventHandler = EventHandler<AnimationEvent>;
        type TransitionEventHandler = EventHandler<TransitionEvent>;
        type GenericEventHandler = EventHandler<Event>;
        type PointerEventHandler = EventHandler<PointerEvent>;

        interface DOMAttributes {
            children?: ElementChild[]|ElementChild;

            // Image Events
            onLoad?: GenericEventHandler;
            onLoadCapture?: GenericEventHandler;
            onError?: GenericEventHandler;
            onErrorCapture?: GenericEventHandler;

            // Clipboard Events
            onCopy?: ClipboardEventHandler;
            onCopyCapture?: ClipboardEventHandler;
            onCut?: ClipboardEventHandler;
            onCutCapture?: ClipboardEventHandler;
            onPaste?: ClipboardEventHandler;
            onPasteCapture?: ClipboardEventHandler;

            // Composition Events
            onCompositionEnd?: CompositionEventHandler;
            onCompositionEndCapture?: CompositionEventHandler;
            onCompositionStart?: CompositionEventHandler;
            onCompositionStartCapture?: CompositionEventHandler;
            onCompositionUpdate?: CompositionEventHandler;
            onCompositionUpdateCapture?: CompositionEventHandler;

            // Details Events
            onToggle?: GenericEventHandler;

            // Focus Events
            onFocus?: FocusEventHandler;
            onFocusCapture?: FocusEventHandler;
            onBlur?: FocusEventHandler;
            onBlurCapture?: FocusEventHandler;

            // Form Events
            onChange?: GenericEventHandler;
            onChangeCapture?: GenericEventHandler;
            onInput?: GenericEventHandler;
            onInputCapture?: GenericEventHandler;
            onSearch?: GenericEventHandler;
            onSearchCapture?: GenericEventHandler;
            onSubmit?: GenericEventHandler;
            onSubmitCapture?: GenericEventHandler;
            onInvalid?: GenericEventHandler;
            onInvalidCapture?: GenericEventHandler;
            onReset?: GenericEventHandler;
            onResetCapture?: GenericEventHandler;
            onFormData?: GenericEventHandler;
            onFormDataCapture?: GenericEventHandler;

            // Keyboard Events
            onKeyDown?: KeyboardEventHandler;
            onKeyDownCapture?: KeyboardEventHandler;
            onKeyPress?: KeyboardEventHandler;
            onKeyPressCapture?: KeyboardEventHandler;
            onKeyUp?: KeyboardEventHandler;
            onKeyUpCapture?: KeyboardEventHandler;

            // Media Events
            onAbort?: GenericEventHandler;
            onAbortCapture?: GenericEventHandler;
            onCanPlay?: GenericEventHandler;
            onCanPlayCapture?: GenericEventHandler;
            onCanPlayThrough?: GenericEventHandler;
            onCanPlayThroughCapture?: GenericEventHandler;
            onDurationChange?: GenericEventHandler;
            onDurationChangeCapture?: GenericEventHandler;
            onEmptied?: GenericEventHandler;
            onEmptiedCapture?: GenericEventHandler;
            onEncrypted?: GenericEventHandler;
            onEncryptedCapture?: GenericEventHandler;
            onEnded?: GenericEventHandler;
            onEndedCapture?: GenericEventHandler;
            onLoadedData?: GenericEventHandler;
            onLoadedDataCapture?: GenericEventHandler;
            onLoadedMetadata?: GenericEventHandler;
            onLoadedMetadataCapture?: GenericEventHandler;
            onLoadStart?: GenericEventHandler;
            onLoadStartCapture?: GenericEventHandler;
            onPause?: GenericEventHandler;
            onPauseCapture?: GenericEventHandler;
            onPlay?: GenericEventHandler;
            onPlayCapture?: GenericEventHandler;
            onPlaying?: GenericEventHandler;
            onPlayingCapture?: GenericEventHandler;
            onProgress?: GenericEventHandler;
            onProgressCapture?: GenericEventHandler;
            onRateChange?: GenericEventHandler;
            onRateChangeCapture?: GenericEventHandler;
            onSeeked?: GenericEventHandler;
            onSeekedCapture?: GenericEventHandler;
            onSeeking?: GenericEventHandler;
            onSeekingCapture?: GenericEventHandler;
            onStalled?: GenericEventHandler;
            onStalledCapture?: GenericEventHandler;
            onSuspend?: GenericEventHandler;
            onSuspendCapture?: GenericEventHandler;
            onTimeUpdate?: GenericEventHandler;
            onTimeUpdateCapture?: GenericEventHandler;
            onVolumeChange?: GenericEventHandler;
            onVolumeChangeCapture?: GenericEventHandler;
            onWaiting?: GenericEventHandler;
            onWaitingCapture?: GenericEventHandler;

            // MouseEvents
            onClick?: MouseEventHandler;
            onClickCapture?: MouseEventHandler;
            onContextMenu?: MouseEventHandler;
            onContextMenuCapture?: MouseEventHandler;
            onDblClick?: MouseEventHandler;
            onDblClickCapture?: MouseEventHandler;
            onDrag?: DragEventHandler;
            onDragCapture?: DragEventHandler;
            onDragEnd?: DragEventHandler;
            onDragEndCapture?: DragEventHandler;
            onDragEnter?: DragEventHandler;
            onDragEnterCapture?: DragEventHandler;
            onDragExit?: DragEventHandler;
            onDragExitCapture?: DragEventHandler;
            onDragLeave?: DragEventHandler;
            onDragLeaveCapture?: DragEventHandler;
            onDragOver?: DragEventHandler;
            onDragOverCapture?: DragEventHandler;
            onDragStart?: DragEventHandler;
            onDragStartCapture?: DragEventHandler;
            onDrop?: DragEventHandler;
            onDropCapture?: DragEventHandler;
            onMouseDown?: MouseEventHandler;
            onMouseDownCapture?: MouseEventHandler;
            onMouseEnter?: MouseEventHandler;
            onMouseEnterCapture?: MouseEventHandler;
            onMouseLeave?: MouseEventHandler;
            onMouseLeaveCapture?: MouseEventHandler;
            onMouseMove?: MouseEventHandler;
            onMouseMoveCapture?: MouseEventHandler;
            onMouseOut?: MouseEventHandler;
            onMouseOutCapture?: MouseEventHandler;
            onMouseOver?: MouseEventHandler;
            onMouseOverCapture?: MouseEventHandler;
            onMouseUp?: MouseEventHandler;
            onMouseUpCapture?: MouseEventHandler;

            // Selection Events
            onSelect?: GenericEventHandler;
            onSelectCapture?: GenericEventHandler;

            // Touch Events
            onTouchCancel?: TouchEventHandler;
            onTouchCancelCapture?: TouchEventHandler;
            onTouchEnd?: TouchEventHandler;
            onTouchEndCapture?: TouchEventHandler;
            onTouchMove?: TouchEventHandler;
            onTouchMoveCapture?: TouchEventHandler;
            onTouchStart?: TouchEventHandler;
            onTouchStartCapture?: TouchEventHandler;

            // Pointer Events
            onPointerOver?: PointerEventHandler;
            onPointerOverCapture?: PointerEventHandler;
            onPointerEnter?: PointerEventHandler;
            onPointerEnterCapture?: PointerEventHandler;
            onPointerDown?: PointerEventHandler;
            onPointerDownCapture?: PointerEventHandler;
            onPointerMove?: PointerEventHandler;
            onPointerMoveCapture?: PointerEventHandler;
            onPointerUp?: PointerEventHandler;
            onPointerUpCapture?: PointerEventHandler;
            onPointerCancel?: PointerEventHandler;
            onPointerCancelCapture?: PointerEventHandler;
            onPointerOut?: PointerEventHandler;
            onPointerOutCapture?: PointerEventHandler;
            onPointerLeave?: PointerEventHandler;
            onPointerLeaveCapture?: PointerEventHandler;
            onGotPointerCapture?: PointerEventHandler;
            onGotPointerCaptureCapture?: PointerEventHandler;
            onLostPointerCapture?: PointerEventHandler;
            onLostPointerCaptureCapture?: PointerEventHandler;

            // UI Events
            onScroll?: UIEventHandler;
            onScrollCapture?: UIEventHandler;

            // Wheel Events
            onWheel?: WheelEventHandler;
            onWheelCapture?: WheelEventHandler;

            // Animation Events
            onAnimationStart?: AnimationEventHandler;
            onAnimationStartCapture?: AnimationEventHandler;
            onAnimationEnd?: AnimationEventHandler;
            onAnimationEndCapture?: AnimationEventHandler;
            onAnimationIteration?: AnimationEventHandler;
            onAnimationIterationCapture?: AnimationEventHandler;

            // Transition Events
            onTransitionEnd?: TransitionEventHandler;
            onTransitionEndCapture?: TransitionEventHandler;
        }

        type Attribute<T> = T|Property<T>;

        interface HTMLAttributes extends DOMAttributes {
            // Standard HTML Attributes
            accept?: Attribute<string>;
            acceptCharset?: Attribute<string>;
            accessKey?: Attribute<string>;
            action?: Attribute<string>;
            allowFullScreen?: Attribute<boolean>;
            allowTransparency?: Attribute<boolean>;
            alt?: Attribute<string>;
            as?: Attribute<string>;
            async?: Attribute<boolean>;
            autocomplete?: Attribute<string>;
            autoComplete?: Attribute<string>;
            autocorrect?: Attribute<string>;
            autoCorrect?: Attribute<string>;
            autofocus?: Attribute<boolean>;
            autoFocus?: Attribute<boolean>;
            autoPlay?: Attribute<boolean>;
            capture?: Attribute<boolean | string>;
            cellPadding?: Attribute<number | string>;
            cellSpacing?: Attribute<number | string>;
            charSet?: Attribute<string>;
            challenge?: Attribute<string>;
            checked?: Attribute<boolean>;
            class?: Attribute<string> | Record<string, Attribute<boolean>>;
            // className?: Attribute<string>;
            cols?: Attribute<number>;
            colSpan?: Attribute<number>;
            content?: Attribute<string>;
            contentEditable?: Attribute<boolean>;
            contextMenu?: Attribute<string>;
            controls?: Attribute<boolean>;
            controlsList?: Attribute<string>;
            coords?: Attribute<string>;
            crossOrigin?: Attribute<string>;
            data?: Attribute<string>;
            dateTime?: Attribute<string>;
            default?: Attribute<boolean>;
            defer?: Attribute<boolean>;
            dir?: Attribute<"auto" | "rtl" | "ltr">;
            disabled?: Attribute<boolean>;
            disableRemotePlayback?: Attribute<boolean>;
            download?: Attribute<string>;
            draggable?: Attribute<boolean>;
            encType?: Attribute<string>;
            form?: Attribute<string>;
            formAction?: Attribute<string>;
            formEncType?: Attribute<string>;
            formMethod?: Attribute<string>;
            formNoValidate?: Attribute<boolean>;
            formTarget?: Attribute<string>;
            frameBorder?: Attribute<number | string>;
            headers?: Attribute<string>;
            height?: Attribute<number | string>;
            hidden?: Attribute<boolean>;
            high?: Attribute<number>;
            href?: Attribute<string>;
            hrefLang?: Attribute<string>;
            for?: Attribute<string>;
            htmlFor?: Attribute<string>;
            httpEquiv?: Attribute<string>;
            icon?: Attribute<string>;
            id?: Attribute<string>;
            inputMode?: Attribute<string>;
            integrity?: Attribute<string>;
            is?: Attribute<string>;
            keyParams?: Attribute<string>;
            keyType?: Attribute<string>;
            kind?: Attribute<string>;
            label?: Attribute<string>;
            lang?: Attribute<string>;
            list?: Attribute<string>;
            loading?: Attribute<"eager" | "lazy">;
            loop?: Attribute<boolean>;
            low?: Attribute<number>;
            manifest?: Attribute<string>;
            marginHeight?: Attribute<number>;
            marginWidth?: Attribute<number>;
            max?: Attribute<number | string>;
            maxLength?: Attribute<number>;
            media?: Attribute<string>;
            mediaGroup?: Attribute<string>;
            method?: Attribute<string>;
            min?: Attribute<number | string>;
            minLength?: Attribute<number>;
            multiple?: Attribute<boolean>;
            muted?: Attribute<boolean>;
            name?: Attribute<string>;
            nonce?: Attribute<string>;
            noValidate?: Attribute<boolean>;
            open?: Attribute<boolean>;
            optimum?: Attribute<number>;
            pattern?: Attribute<string>;
            placeholder?: Attribute<string>;
            playsInline?: Attribute<boolean>;
            poster?: Attribute<string>;
            preload?: Attribute<string>;
            radioGroup?: Attribute<string>;
            readOnly?: Attribute<boolean>;
            rel?: Attribute<string>;
            required?: Attribute<boolean>;
            role?: Attribute<string>;
            rows?: Attribute<number>;
            rowSpan?: Attribute<number>;
            sandbox?: Attribute<string>;
            scope?: Attribute<string>;
            scoped?: Attribute<boolean>;
            scrolling?: Attribute<string>;
            seamless?: Attribute<boolean>;
            selected?: Attribute<boolean>;
            shape?: Attribute<string>;
            size?: Attribute<number>;
            sizes?: Attribute<string>;
            slot?: Attribute<string>;
            span?: Attribute<number>;
            spellcheck?: Attribute<boolean>;
            src?: Attribute<string>;
            srcset?: Attribute<string>;
            srcDoc?: Attribute<string>;
            srcLang?: Attribute<string>;
            srcSet?: Attribute<string>;
            start?: Attribute<number>;
            step?: Attribute<number | string>;
            style?: Attribute<string | {
                [TKey in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[TKey]|Property<CSSStyleDeclaration[TKey]>
            }>;
            summary?: Attribute<string>;
            tabIndex?: Attribute<number>;
            target?: Attribute<string>;
            title?: Attribute<string>;
            type?: Attribute<string>;
            useMap?: Attribute<string>;
            value?: Attribute<string | string[] | number>;
            volume?: Attribute<string | number>;
            width?: Attribute<number | string>;
            wmode?: Attribute<string>;
            wrap?: Attribute<string>;

            // RDFa Attributes
            about?: Attribute<string>;
            datatype?: Attribute<string>;
            inlist?: Attribute<boolean>;
            prefix?: Attribute<string>;
            property?: Attribute<string>;
            resource?: Attribute<string>;
            typeof?: Attribute<string>;
            vocab?: Attribute<string>;

            // Microdata Attributes
            itemProp?: Attribute<string>;
            itemScope?: Attribute<boolean>;
            itemType?: Attribute<string>;
            itemID?: Attribute<string>;
            itemRef?: Attribute<string>;
        }
        type IntrinsicElementsHTML = { [TKey in keyof HTMLElementTagNameMap]?: HTMLAttributes & {
            ref?: ValueProperty<HTMLElementTagNameMap[TKey]|undefined>
        }};

        type IntrinsicElements = IntrinsicElementsHTML;
    }
}
