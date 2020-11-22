declare namespace JSX {
    type Observer<T> = (event: T) => boolean | Promise<void> | void;
    interface Property<T> {
        value: T;
        observe(observer: Observer<T>): void;
    }
    type PropertyValue<T> = T extends Property<infer TValue> ? TValue : never;
    interface Emitter<T> {
        observe(observer: Observer<T>): void;
    }
    type EmitterObserver<T> = T extends Emitter<infer TValue> ? Observer<TValue> : never;
    interface ElementAttributesProperty {
        __bogusProps: {
            [K in keyof this]?: this[K]|Property<this[K]>|PropertyValue<this[K]>|EmitterObserver<this[K]>;
        };
    }
}
