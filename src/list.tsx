// CSTK
// Copyrightcontext.destroy(c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { bind, Property, ValueProperty } from "./property";
import { apply } from "./component";
import { Emitter } from "./emitter";
import { Context } from "./context";

export class ListProperty<T> {
    private _items: ValueProperty<T>[] = [];
    readonly length = bind(0);
    readonly onInsert = new Emitter<{index: number, item: Property<T>}>();
    readonly onRemove = new Emitter<number>();

    constructor(
        initialItems: T[],
    ) {
        this._items = initialItems.map(item => bind(item));
        this.length.value = this._items.length;
    }

    get items() {
        return this._items;
    }

    insert(index: number, item: T): void {
        const prop = bind(item);
        this._items.splice(index, 0, prop);
        this.onInsert.emit({index, item: prop});
        this.length.value++;
    }

    updateAll(items: T[]) {
        if (items.length < this._items.length) {
            while (this._items.length > items.length) {
                this.remove(this._items.length - 1);
            }
        }
        for (let i = 0; i < this._items.length; i++) {
            this._items[i].value = items[i];
        }
        for (let i = this._items.length; i < items.length; i++) {
            this.push(items[i]);
        }
    }

    push(item: T): void {
        const index = this.length.value;
        const prop = bind(item);
        this._items.push(prop);
        this.onInsert.emit({index, item: prop});
        this.length.value++;
    }

    pushAll(items: T[]): void {
        items.forEach(item => this.push(item));
    }

    remove(index: number): T|undefined {
        if (index >= 0 && index < this._items.length) {
            const removed = this._items.splice(index, 1)[0];
            this.onRemove.emit(index);
            this.length.value--;
            return removed.value;
        }
    }

    clear(): void {
        while (this._items.length) {
            this.remove(this._items.length - 1);
        }
    }
}

export class KeyedListProperty<TItem, TKey> {
    constructor(
        items: TItem[],
        private key: (item: TItem) => TKey,
    ) {
    }
}

export function bindList<T>(initialItems: T[] = []): ListProperty<T> {
    return new ListProperty(initialItems);
}

export function For<T>({each, children}: {
    each: ListProperty<T>|Property<T[]>,
    children: (value: Property<T>, index: Property<number>) => JSX.Element
}, context: Context): JSX.Element {
    const marker = document.createComment('<For>');
    let items: [Node[], Context, ValueProperty<number>][] = [];
    if (each instanceof ListProperty) {
        context.onInit(() => {
            each.items.forEach((item, index) => {
                const nodes: Node[] = [];
                const subcontext = new Context(context);
                const indexProperty = bind(index);
                apply(children(item, indexProperty), subcontext).forEach(node => {
                    if (!marker.parentElement) {
                        return;
                    }
                    nodes.push(node);
                    marker.parentElement.insertBefore(node, marker);
                });
                items.push([nodes, subcontext, indexProperty]);
                subcontext.init();
            });
            context.onDestroy(each.onInsert.observe(({index, item}) => {
                if (index >= items.length) {
                    const nodes: Node[] = [];
                    const subcontext = new Context(context);
                    const indexProperty = bind(index);
                    apply(children(item, indexProperty), subcontext).forEach(node => {
                        if (!marker.parentElement) {
                            return;
                        }
                        nodes.push(node);
                        marker.parentElement.insertBefore(node, marker);
                    });
                    items.push([nodes, subcontext, indexProperty]);
                    subcontext.init();
                } else {
                    let next: Node = marker;
                    for (let i = index; i < items.length; i++) {
                        if (items[i][0].length) {
                            next = items[i][0][0];
                            break;
                        }
                    }
                    const nodes: Node[] = [];
                    const subcontext = new Context(context);
                    const indexProperty = bind(index);
                    apply(children(item, indexProperty), subcontext).forEach(node => {
                        if (!next.parentElement) {
                            return;
                        }
                        nodes.push(node);
                        next.parentElement.insertBefore(node, next);
                    });
                    items.splice(index, 0, [nodes, subcontext, indexProperty]);
                    subcontext.init();
                    for (let i = index + 1; i < items.length; i++) {
                        items[i][2].value = i;
                    }
                }
            }));
            context.onDestroy(each.onRemove.observe(index => {
                items.splice(index, 1).forEach(([nodes, subcontext]) => {
                    nodes.forEach(node => node.parentElement?.removeChild(node));
                    nodes.splice(0);
                    subcontext.destroy();
                });
                for (let i = index; i < items.length; i++) {
                    items[i][2].value = i;
                }
            }));
            context.onDestroy(() => {
                items.forEach(([nodes, subcontext]) => {
                    nodes.forEach(node => node.parentElement?.removeChild(node));
                    nodes.splice(0);
                    subcontext.destroy();
                });
            });
        });
    } else {
        const properties = each.value.map(v => bind(v));
        context.onInit(() => {
            properties.forEach((item, index) => {
                const nodes: Node[] = [];
                const subcontext = new Context(context);
                const indexProperty = bind(index);
                apply(children(item, indexProperty), subcontext).forEach(node => {
                    if (!marker.parentElement) {
                        return;
                    }
                    nodes.push(node);
                    marker.parentElement.insertBefore(node, marker);
                });
                items.push([nodes, subcontext, indexProperty]);
                subcontext.init();
            });
            context.onDestroy(each.observe(xs => {
                if (xs.length < properties.length) {
                    properties.splice(xs.length);
                    items.splice(xs.length).forEach(([nodes, subcontext]) => {
                        nodes.forEach(node => node.parentElement?.removeChild(node));
                        nodes.splice(0);
                        subcontext.destroy();
                    });
                    for (let i = 0; i < properties.length; i++) {
                        properties[i].value = xs[i];
                    }
                } else if (xs.length > properties.length) {
                    for (let i = 0; i < properties.length; i++) {
                        properties[i].value = xs[i];
                    }
                    for (let i = properties.length; i < xs.length; i++) {
                        const nodes: Node[] = [];
                        const subcontext = new Context(context);
                        const property = bind(xs[i]);
                        properties.push(property);
                        const indexProperty = bind(i);
                        apply(children(property, indexProperty), subcontext).forEach(node => {
                            if (!marker.parentElement) {
                                return;
                            }
                            nodes.push(node);
                            marker.parentElement.insertBefore(node, marker);
                        });
                        items.push([nodes, subcontext, indexProperty]);
                        subcontext.init();
                    }
                } else {
                    for (let i = 0; i < properties.length; i++) {
                        properties[i].value = xs[i];
                    }
                }
            }));
            context.onDestroy(() => {
                items.forEach(([nodes, subcontext]) => {
                    nodes.forEach(node => node.parentElement?.removeChild(node));
                    nodes.splice(0);
                    subcontext.destroy();
                });
            });
        });
    }
    return () => marker;
}
