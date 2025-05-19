// CSTK
// Copyright (c) 2024 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { CellIterable } from './array.js';
import { Cell, MutCell, cell } from './cell.js';
import { apply } from './component.js';
import { Context } from './context.js';
import { ElementChildren } from './types.js';

function isIterable(x: unknown): x is Iterable<unknown> {
    return !!x && Symbol.iterator in Object(x);
}

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
 * @param props.else - Alternative to show when array is empty.
 * @category Components
 */
export function For<TItem>(props: {
    each:  Cell<Iterable<TItem>>,
    children: (value: Cell<TItem>, index: number) => ElementChildren,
    else?: ElementChildren,
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
 * @param props.else - Alternative to show when array is empty.
 */
export function For<TItem>(props: {
    each:  Iterable<TItem>,
    children: (value: TItem, index: number) => ElementChildren,
    else?: ElementChildren,
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
 * @param props.else - Alternative to show when array is empty.
 */
export function For<TItem, TKey>(props: {
    each:  CellIterable<TItem, TKey>,
    children: (value: TItem, key: TKey) => ElementChildren,
    else?: ElementChildren,
}, context: Context): JSX.Element;
export function For<TItem, TKey>({each, children, else: elseBranch}: {
    each: Cell<Iterable<TItem>>,
    children: (value: Cell<TItem>, index: number) => ElementChildren,
    else?: ElementChildren,
} | {
    each: Iterable<TItem>,
    children: (value: TItem, index: number) => ElementChildren,
    else?: ElementChildren,
} | {
    each: CellIterable<TItem, TKey>,
    children: (value: TItem, key: TKey) => ElementChildren,
    else?: ElementChildren,
}, context: Context): JSX.Element {
    const marker = document.createComment('<For>');
    let items: [Node[], Context][] = [];
    let elseContext: [Node[], Context] | undefined;
    if (each instanceof Cell) {
        const body = children as (value: Cell<unknown>, index: number) => JSX.Element;
        const cells: MutCell<unknown>[] = [];
        context.onInit(() => {
            context.onDestroy(each.getAndObserve(xs => {
                let i = 0;
                for (const x of xs) {
                    if (elseContext) {
                        elseContext[0].forEach(node => node.parentElement?.removeChild(node));
                        elseContext[1].destroy();
                        elseContext = undefined;
                    }
                    if (i >= cells.length) {
                        const nodes: Node[] = [];
                        const subcontext = new Context(context);
                        const c = cell(x);
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
                    } else {
                        cells[i].value = x;
                    }
                    i++;
                }
                if (i < cells.length) {
                    cells.splice(i);
                    items.splice(i).forEach(([nodes, subcontext]) => {
                        nodes.forEach(node => node.parentElement?.removeChild(node));
                        nodes.splice(0);
                        subcontext.destroy();
                    });
                }
                if (!items.length && elseBranch && marker.parentElement && !elseContext) {
                    const parent = marker.parentElement;
                    const subcontext = new Context(context);
                    const childNodes: Node[] = [];
                    apply(elseBranch, subcontext).forEach(node => {
                        parent.insertBefore(node, marker);
                        childNodes.push(node);
                    });
                    subcontext.init();
                    elseContext = [childNodes, subcontext];
                }
            }));
        });
    } else if (isIterable(each)) {
        const body = children as (value: unknown, index: number) => JSX.Element;
        context.onInit(() => {
            let i = 0;
            for (const item of each) {
                apply(body(item, i), context).forEach(node => {
                    if (!marker.parentElement) {
                        return;
                    }
                    marker.parentElement.insertBefore(node, marker);
                });
                i++;
            }
            if (!i && elseBranch && marker.parentElement) {
                const parent = marker.parentElement;
                apply(elseBranch, context).forEach(node => {
                    parent.insertBefore(node, marker);
                });
            }
        });
    } else {
        const body = children as (value: unknown, key: unknown) => JSX.Element;
        context.onInit(() => {
            context.onDestroy(each.observe(
                (index, item, key) => {
                    if (elseContext) {
                        elseContext[0].forEach(node => node.parentElement?.removeChild(node));
                        elseContext[1].destroy();
                        elseContext = undefined;
                    }
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
                    if (!items.length && elseBranch && marker.parentElement && !elseContext) {
                        const parent = marker.parentElement;
                        const subcontext = new Context(context);
                        const childNodes: Node[] = [];
                        apply(elseBranch, subcontext).forEach(node => {
                            parent.insertBefore(node, marker);
                            childNodes.push(node);
                        });
                        subcontext.init();
                        elseContext = [childNodes, subcontext];
                    }
                },
            ));
        });
    }
    context.onDestroy(() => {
        if (elseContext) {
            elseContext[0].forEach(node => node.parentElement?.removeChild(node));
            elseContext[1].destroy();
            elseContext = undefined;
        }
        items.forEach(([nodes, subcontext]) => {
            nodes.forEach(node => node.parentElement?.removeChild(node));
            nodes.splice(0);
            subcontext.destroy();
        });
    });
    return () => marker;
}
