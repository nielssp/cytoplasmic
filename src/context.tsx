// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { apply } from './component.js';
import { ElementChildren } from './types.js';

let nextContextId = 1;

/**
 * @category Context
 */
export class Context {
    private initialized = false;
    private destroyed = false;
    private initializers: (() => void)[] = [];
    private destructors: (() => void)[] = [];
    private values: Record<number, any>;

    constructor(parent?: Context) {
        if (parent) {
            this.values = {...parent.values};
        } else {
            this.values = {};
        }
    }

    onInit(initializer: () => void): void {
        if (!this.initialized) {
            this.initializers.push(initializer);
        } else if (!this.destroyed) {
            initializer();
        }
    }

    onDestroy(destructor: () => void): void {
        if (!this.destroyed) {
            this.destructors.push(destructor);
        } else {
            destructor();
        }
    }

    use<T>(property: ContextValue<T>): T {
        if (this.values.hasOwnProperty(property.id)) {
            return this.values[property.id];
        } else {
            return property.defaultValue;
        }
    }

    provide<T>(property: ContextValue<T>, value: T): Context {
        const subcontext = new Context(this);
        subcontext.values[property.id] = value;
        this.onInit(() => subcontext.init());
        this.onDestroy(() => subcontext.destroy());
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

/**
 * @category Context
 */
export interface ContextValue<T> {
    id: number;
    defaultValue: T;
    Provider: (props: {value: T, children: ElementChildren}) => JSX.Element;
    Consumer: (props: {children: (value: T) => ElementChildren}) => JSX.Element;
}

/**
 * @category Context
 */
export function createValue<T>(defaultValue: T): ContextValue<T> {
    const id = nextContextId++;
    const Provider = ({value, children}: {value: T, children: ElementChildren}) => {
        return (context: Context) => {
            const subcontext = context.provide(property, value);
            return apply(children, subcontext);
        };
    };
    const Consumer = ({children}: {children: (value: T) => ElementChildren}) => {
        return (context: Context) => {
            const value = context.use(property);
            return apply(children(value), context);
        };
    };
    const property: ContextValue<T> = {id, defaultValue, Provider, Consumer};
    return property;
}
