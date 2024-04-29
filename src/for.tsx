// CSTK
// Copyright (c) 2024 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { CellIterable } from './array';
import { Cell, cell } from './cell';
import { apply } from './component';
import { Context } from './context';
import { ElementChildren } from './types';

/**
 * Iterate over an array of items and render an element for each. When the cell
 * updates the existing DOM-elements will be reused, but an update will be
 * emitted for each item in the array.
 *
 * @example
 * ```tsx
 * const a = cell([1, 2, 3]);
 * <For each={a}>{(item, index) => {
 *     <li>Item {item} and index {index}</li>
 * }</For>
 * ```
 *
 * @param props.each - A cell containing an array of items to iterate over.
 * @param props.children - A function that accepts an item cell and returns an
 * element.
 * @category Components
 */
export function For<TItem>(props: {
    each:  Cell<TItem[]>,
    children: (value: Cell<TItem>, index: number) => ElementChildren,
}, context: Context): JSX.Element;
/**
 * Iterate over a static array of items and render an element for each.
 *
 * @example
 * ```tsx
 * const a = [1, 2, 3];
 * <For each={a}>{(item, index) => {
 *     <li>Item {item} and index {index}</li>
 * }</For>
 * ```
 *
 * @param props.each - An array of items to iterate over.
 * @param props.children - A function that accepts an item and returns an
 * element.
 */
export function For<TItem>(props: {
    each:  TItem[],
    children: (value: TItem, index: number) => ElementChildren,
}, context: Context): JSX.Element;
/**
 * Iterate over a {@link CellIterable} of items and keys. See {@link cellArray}
 * for information on creating dynamic cell arrays.
 *
 * @example
 * ```tsx
 * const a = cellArray([1, 2, 3]);
 * <For each={a.indexed}>{(item, index) => {
 *     <li>Item {item} at index {index}</li>
 * }</For>
 * ```
 *
 * @param props.each - An iterable to itearate over.
 * @param props.children - A function that accepts an item cell and returns an
 * element.
 */
export function For<TItem, TKey>(props: {
    each:  CellIterable<TItem, TKey>,
    children: (value: TItem, key: TKey) => ElementChildren,
}, context: Context): JSX.Element;
export function For<TItem, TKey>({each, children}: {
    each:  Cell<TItem[]>,
    children: (value: Cell<TItem>, index: number) => ElementChildren,
} | {
    each:  TItem[],
    children: (value: TItem, index: number) => ElementChildren,
} | {
    each:  CellIterable<TItem, TKey>,
    children: (value: TItem, key: TKey) => ElementChildren,
}, context: Context): JSX.Element {
    const marker = document.createComment('<For>');
    let items: [Node[], Context][] = [];
    if (each instanceof Cell) {
        const body = children as (value: Cell<unknown>, index: number) => JSX.Element;
        const cells = each.value.map(v => cell(v));
        context.onInit(() => {
            cells.forEach((item, index) => {
                const nodes: Node[] = [];
                const subcontext = new Context(context);
                apply(body(item, index), subcontext).forEach(node => {
                    if (!marker.parentElement) {
                        return;
                    }
                    nodes.push(node);
                    marker.parentElement.insertBefore(node, marker);
                });
                items.push([nodes, subcontext]);
                subcontext.init();
            });
            context.onDestroy(each.observe(xs => {
                if (xs.length < cells.length) {
                    cells.splice(xs.length);
                    items.splice(xs.length).forEach(([nodes, subcontext]) => {
                        nodes.forEach(node => node.parentElement?.removeChild(node));
                        nodes.splice(0);
                        subcontext.destroy();
                    });
                    for (let i = 0; i < cells.length; i++) {
                        cells[i].value = xs[i];
                    }
                } else if (xs.length > cells.length) {
                    for (let i = 0; i < cells.length; i++) {
                        cells[i].value = xs[i];
                    }
                    for (let i = cells.length; i < xs.length; i++) {
                        const nodes: Node[] = [];
                        const subcontext = new Context(context);
                        const c = cell(xs[i]);
                        cells.push(c);
                        apply(body(c, i), subcontext).forEach(node => {
                            if (!marker.parentElement) {
                                return;
                            }
                            nodes.push(node);
                            marker.parentElement.insertBefore(node, marker);
                        });
                        items.push([nodes, subcontext]);
                        subcontext.init();
                    }
                } else {
                    for (let i = 0; i < cells.length; i++) {
                        cells[i].value = xs[i];
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
    } else if (Array.isArray(each)) {
        const body = children as (value: unknown, index: number) => JSX.Element;
        context.onInit(() => {
            each.forEach((item, index) => {
                const nodes: Node[] = [];
                apply(body(item, index), context).forEach(node => {
                    if (!marker.parentElement) {
                        return;
                    }
                    nodes.push(node);
                    marker.parentElement.insertBefore(node, marker);
                });
            });
        });
    } else {
        const body = children as (value: unknown, key: unknown) => JSX.Element;
        context.onInit(() => {
            context.onDestroy(each.observe(
                (index, item, key) => {
                    const subcontext = new Context(context);
                    if (index >= items.length) {
                        const nodes: Node[] = [];
                        apply(body(item, key), subcontext).forEach(node => {
                            if (!marker.parentElement) {
                                return;
                            }
                            nodes.push(node);
                            marker.parentElement.insertBefore(node, marker);
                        });
                        items.push([nodes, subcontext]);
                    } else {
                        let next: Node = marker;
                        for (let i = index; i < items.length; i++) {
                            if (items[i][0].length) {
                                next = items[i][0][0];
                                break;
                            }
                        }
                        const nodes: Node[] = [];
                        apply(body(item, key), subcontext).forEach(node => {
                            if (!next.parentElement) {
                                return;
                            }
                            nodes.push(node);
                            next.parentElement.insertBefore(node, next);
                        });
                        items.splice(index, 0, [nodes, subcontext]);
                    }
                    subcontext.init();
                },
                index => {
                    items.splice(index, 1).forEach(([nodes, subcontext]) => {
                        nodes.forEach(node => node.parentElement?.removeChild(node));
                        nodes.splice(0);
                        subcontext.destroy();
                    });
                },
            ));
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
