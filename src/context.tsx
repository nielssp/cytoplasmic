// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { apply } from "./component";

let nextContextId = 1;

export class Context {
    private initialized = false;
    private destroyed = false;
    private initializers: (() => void)[] = [];
    private destructors: (() => void)[] = [];
    private properties: Record<number, any>;

    constructor(parent?: Context) {
        if (parent) {
            this.properties = {...parent.properties};
        } else {
            this.properties = {};
        }
    }

    onInit(initializer: () => void): void {
        this.initializers.push(initializer);
    }

    onDestroy(destructor: () => void): void {
        this.destructors.push(destructor);
    }

    use<T>(property: ContextValue<T>): T {
        if (this.properties.hasOwnProperty(property.id)) {
            return this.properties[property.id];
        } else {
            return property.defaultValue;
        }
    }

    provide<T>(property: ContextValue<T>, value: T): Context {
        const subcontext = new Context(this);
        subcontext.properties[property.id] = value;
        return subcontext;
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

export interface ContextValue<T> {
    id: number;
    defaultValue: T;
    Provider: (props: {value: T, children: JSX.Element|JSX.Element[]}) => JSX.Element;
    Consumer: (props: {children: (value: T) => JSX.Element|JSX.Element[]}) => JSX.Element;
}

export function createValue<T>(defaultValue: T): ContextValue<T> {
    const id = nextContextId++;
    const Provider = ({value, children}: {value: T, children: JSX.Element|JSX.Element[]}) => {
        return (context: Context) => {
            const subcontext = context.provide(property, value);
            return apply(children, subcontext);
        };
    };
    const Consumer = ({children}: {children: (value: T) => JSX.Element|JSX.Element[]}) => {
        return (context: Context) => {
            const value = context.use(property);
            return apply(children(value), context);
        };
    };
    const property: ContextValue<T> = {id, defaultValue, Provider, Consumer};
    return property;
}
