// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Cell, Input, MutCell, MutRefCell, RefCell, cell, input } from "./cell";
import { Context } from "./context";
import { ElementChildren } from "./types";

function appendChildren(element: HTMLElement, children: ElementChildren[], context: Context): void {
    apply(children, context).forEach(child => {
        element.appendChild(child);
    });
}

export type ComponentProps<T> = T & {
    children?: ElementChildren,
};
export type Component<T = {}> = (props: ComponentProps<T>, context: Context) => JSX.Element;

type ElementAttributes<T> = Record<string, string|number|boolean|Cell<string>|Cell<number>|Cell<boolean>|EventListenerOrEventListenerObject> & {
    ref?: MutRefCell<T>,
};

export function createElement<TElem extends keyof HTMLElementTagNameMap>(name: TElem, properties: ElementAttributes<HTMLElementTagNameMap[TElem]>, ... children: ElementChildren[]): JSX.Element;
export function createElement<T extends {}>(name: Component<T>, properties: T, ... children: ElementChildren[]): JSX.Element;
export function createElement<TElem extends keyof HTMLElementTagNameMap, TProps extends {}>(name: TElem|Component<TProps>, properties: TProps & ElementAttributes<HTMLElementTagNameMap[TElem]>, ... children: ElementChildren[]): JSX.Element {
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
                            if (value instanceof Cell) {
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
                                        if (declValue instanceof Cell) {
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
                            if (value instanceof Cell) {
                                context.onDestroy(value.getAndObserve((value: string|number|boolean|object) => {
                                    e.setAttribute('class', '' + value);
                                }));
                            } else if (typeof value === 'object') {
                                for (let key in value) {
                                    if (value.hasOwnProperty(key)) {
                                        const declValue = (value as any)[key as any] as any;
                                        if (declValue instanceof Cell) {
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
                            if (value instanceof MutCell) {
                                value.value = e;
                            }
                        } else if (value instanceof Cell) {
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

export function flatten(elements: ElementChildren): JSX.Element {
    return context => apply(elements, context);
}

export function apply(elements: ElementChildren, context: Context): Node[] {
    const result: Node[] = [];
    if (typeof elements === 'string') {
        result.push(document.createTextNode(elements));
    } else if (typeof elements === 'number' || typeof elements === 'boolean') {
        result.push(document.createTextNode('' + elements));
    } else if (Array.isArray(elements)) {
        elements.forEach(element => {
            result.push(...apply(element, context));
        });
    } else if (elements instanceof Cell) {
        const text = document.createTextNode('' + elements.value);
        const unobserve = elements.observe((value: string | number | boolean) => {
            text.textContent = '' + value;
        });
        context.onDestroy(() => unobserve());
        result.push(text);
    } else if (elements instanceof Node) {
        result.push(elements);
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

export function Show(props: {
    children: ElementChildren,
    when: Input<any>,
    else?: ElementChildren,
}): JSX.Element {
    const when = input(props.when);
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
            if (!marker.parentElement) {
                return; // shouldn't be possible
            }
            const parent = marker.parentElement;
            if (condition) {
                if (subcontext) {
                    childNodes.splice(0).forEach(node => node.parentElement?.removeChild(node));
                    subcontext.destroy();
                }
                subcontext = new Context(context);
                apply(props.children, subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            } else {
                if (subcontext) {
                    childNodes.splice(0).forEach(node => node.parentElement?.removeChild(node));
                    subcontext.destroy();
                    subcontext = undefined;
                }
                if (props.else) {
                    subcontext = new Context(context);
                    apply(props.else, subcontext).forEach(node => {
                        parent.insertBefore(node, marker);
                        childNodes.push(node);
                    });
                    subcontext.init();
                }
            }
            previous = condition;
        };
        context.onInit(() => {
            when.getAndObserve(observer);
        });
        context.onDestroy(() => {
            childNodes.forEach(node => node.parentElement?.removeChild(node));
            childNodes.splice(0);
            when.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Deref<T>(props: {
    children: (value: Cell<T>) => ElementChildren
    ref: Cell<T | undefined | null>,
    else?: ElementChildren,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Deref>');
        const childNodes: Node[] = [];
        let property: MutCell<T> | undefined;
        let present = false;
        let subcontext: Context | undefined;
        const observer = (value: T | undefined | null) => {
            if (!marker.parentElement) {
                return; // shouldn't be possible
            }
            const parent = marker.parentElement;
            if (value !== undefined && value !== null) {
                if (!property) {
                    property = cell(value);
                } else {
                    property.value = value;
                }
                if (present) {
                    return;
                }
                present = true;
                if (subcontext) {
                    childNodes.splice(0).forEach(node => node.parentElement?.removeChild(node));
                    subcontext.destroy();
                }
                subcontext = new Context(context);
                apply(props.children(property), subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            } else {
                present = false;
                if (subcontext) {
                    childNodes.splice(0).forEach(node => node.parentElement?.removeChild(node));
                    subcontext.destroy();
                    subcontext = undefined;
                }
                if (props.else) {
                    subcontext = new Context(context);
                    apply(props.else, subcontext).forEach(node => {
                        parent.insertBefore(node, marker);
                        childNodes.push(node);
                    });
                    subcontext.init();
                }
            }
        };
        context.onInit(() => {
            props.ref.getAndObserve(observer);
        });
        context.onDestroy(() => {
            childNodes.forEach(node => node.parentElement?.removeChild(node));
            childNodes.splice(0);
            props.ref.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Unwrap<T>(props: {
    children: (value: T) => ElementChildren
    from: Cell<T | undefined | null>,
    else?: ElementChildren,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Unwrap>');
        const childNodes: Node[] = [];
        let subcontext: Context | undefined;
        const observer = (value: T | undefined | null) => {
            if (subcontext) {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                childNodes.splice(0);
                subcontext.destroy();
                subcontext = undefined;
            }
            if (!marker.parentElement) {
                return; // shouldn't be possible
            }
            const parent = marker.parentElement;
            if (value !== undefined && value !== null) {
                subcontext = new Context(context);
                apply(props.children(value), subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            } else if (props.else) {
                subcontext = new Context(context);
                apply(props.else, subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            }
        };
        context.onInit(() => {
            props.from.getAndObserve(observer);
        });
        context.onDestroy(() => {
            childNodes.forEach(node => node.parentElement?.removeChild(node));
            childNodes.splice(0);
            props.from.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Lazy(props: {
    children: () => Promise<ElementChildren>
    else?: ElementChildren,
    onError?: (error: any) => void,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Lazy>');
        const childNodes: Node[] = [];
        let subcontext: Context | undefined;
        const setElement = (element: ElementChildren) => {
            if (subcontext) {
                childNodes.splice(0).forEach(node => node.parentElement?.removeChild(node));
                subcontext.destroy();
                subcontext = undefined;
            }
            if (!marker.parentElement) {
                return;
            }
            const parent = marker.parentElement;
            subcontext = new Context(context);
            apply(element, subcontext).forEach(node => {
                parent.insertBefore(node, marker);
                childNodes.push(node);
            });
            subcontext.init();
        };
        context.onInit(() => {
            if (props.else) {
                setElement(props.else);
            }
            props.children().then(element => {
                setElement(element);
            }, error => {
                if (props.onError) {
                    props.onError(error);
                } else {
                    console.error('Failed loading lazy component:', error);
                }
            });
        });
        context.onDestroy(() => {
            childNodes.forEach(node => node.parentElement?.removeChild(node));
            childNodes.splice(0);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Dynamic<T>(props: T & {
    component: RefCell<Component<T>>,
    else?: ElementChildren,
}): JSX.Element {
    return context => {
        const marker = document.createComment('<Dynamic>');
        const childNodes: Node[] = [];
        let subcontext: Context | undefined;
        const observer = (component?: Component<T>) => {
            if (subcontext) {
                childNodes.splice(0).forEach(node => node.parentElement?.removeChild(node));
                subcontext.destroy();
            }
            if (!marker.parentElement) {
                return; // shouldn't be possible
            }
            const parent = marker.parentElement;
            if (component) {
                subcontext = new Context(context);
                apply(component(props, subcontext), subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            } else if (props.else) {
                subcontext = new Context(context);
                apply(props.else, subcontext).forEach(node => {
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
            childNodes.forEach(node => node.parentElement?.removeChild(node));
            childNodes.splice(0);
            props.component.unobserve(observer);
            subcontext?.destroy();
        });
        return marker;
    };
}

export function Style(props: {
    children: ElementChildren
} & {
    [TKey in keyof CSSStyleDeclaration]?: Input<CSSStyleDeclaration[TKey]>
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
                    if (value instanceof Cell) {
                        context.onDestroy(value.getAndObserve(v => child.style[key] = v));
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

export function Fragment({children}: {children: ElementChildren}): JSX.Element {
    return flatten(children);
}
