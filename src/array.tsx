// CSTK
// Copyright (c) 2024 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Cell, MutCell, cell } from './cell';
import { Emitter, createEmitter } from './emitter';

/**
 * Create a mutable array of cells that keeps track of insertions and deletions.
 *
 * Use this instead of a regular array cell (`cell([1, 2, 3])`) when you need to
 * modify individual cells or need to make many small insertions and deletions.
 *
 * @param initialItems - The initial items of the array
 * @returns A reactive cell array
 * @category Cell streams and arrays
 */
export function cellArray<TItem>(initialItems: Iterable<TItem> = []): CellArray<TItem> {
    return new CellArray(initialItems);
}

/**
 * @category Cell streams and arrays
 */
export function cellMap<TKey, TValue>(initialEntries: Iterable<[TKey, TValue]> = []): CellMap<TKey, TValue> {
    return new CellMap(initialEntries);
}

/**
 * Common interface for data structures that can be passed to {@link For}.
 *
 * @category Cell streams and arrays
 */
export interface CellIterable<TValue, TKey> {
    /**
     * Observe this iterable. Upon attaching an observer `insert` is called for
     * each item currently contained in the underlying collection.
     *
     * @param insert - An observer that is called whenever an item is inserted.
     * @param remove - An observer that is called whenever an item is removed.
     * @returns A function that should be called to detach the observer
     * functions.
     */
    observe(
        insert: (index: number, item: TValue, key: TKey) => void,
        remove: (index: number) => void,
    ): () => void;
}

/**
 * Common base class for collections of cells that can be mapped and filtered.
 *
 * @category Cell streams and arrays
 */
export abstract class CellStream<TItem, TKey> implements CellIterable<Cell<TItem>, TKey>  {
    abstract observe(
        insert: (index: number, item: Cell<TItem>, key: TKey) => void,
        remove: (index: number) => void,
    ): () => void;

    /**
     * Create a strem that applies a function to each item emitted by this
     * stream.
     * 
     * @param f - The function to apply to items.
     * @returns A new stream.
     */
    map<TOut>(f: (item: TItem, key: TKey) => TOut): CellStream<TOut, TKey> {
        return new CellStreamWrapper((insert, remove) => {
            return this.observe((index, item, key) => insert(index, item.map(v => f(v, key)), key), remove);
        });
    }

    /**
     * Create a strem that applies a function to the key of each item
     * emitted by this stream.
     * 
     * @param f - The function to apply to items. The returned value will be the
     * new key.
     * @returns A new stream.
     */
    mapKey<TOut>(f: (item: Cell<TItem>, key: TKey) => TOut): CellStream<TItem, TOut> {
        return new CellStreamWrapper((insert, remove) => {
            return this.observe((index, item, key) => insert(index, item, f(item, key)), remove);
        });
    }

    /**
     * Create a stream that only includes items from this stream for which the
     * given predicate function returns true.
     *
     * @param f - The predicate function to apply to items.
     * @returns A new stream.
     */
    filter(f: (item: TItem) => boolean): CellStream<TItem, TKey> {
        return new CellStreamWrapper((insert, remove) => {
            type FilteredItem = {unobserve?: () => void, mappedIndex: number};
            const filteredItems: FilteredItem[] = [];
            const destroy = this.observe((index, item, key) => {
                const filteredItem: FilteredItem = {
                    mappedIndex: -1,
                };
                if (index >= filteredItems.length) {
                    filteredItems.push(filteredItem);
                } else {
                    filteredItems.splice(index, 0, filteredItem);
                }
                filteredItem.unobserve = item.getAndObserve(x => {
                    if (f(x)) {
                        if (filteredItem.mappedIndex >= 0) {
                            return;
                        }
                        let currentIndex = 0;
                        for (let i = 0; i < filteredItems.length; i++) {
                            if (filteredItems[i] === filteredItem) {
                                if (filteredItem.mappedIndex >= 0) {
                                    filteredItem.mappedIndex++;
                                } else {
                                    filteredItem.mappedIndex = 0;
                                }
                                currentIndex = i;
                                break;
                            }
                            if (filteredItems[i].mappedIndex >= 0) {
                                filteredItem.mappedIndex = filteredItems[i].mappedIndex;
                            }
                        }
                        insert(filteredItem.mappedIndex, item, key);
                        for (let i = currentIndex + 1; i < filteredItems.length; i++) {
                            if (filteredItems[i].mappedIndex >= 0) {
                                filteredItems[i].mappedIndex++;
                            }
                        }
                    } else if (filteredItem.mappedIndex >= 0) {
                        remove(filteredItem.mappedIndex);
                        filteredItem.mappedIndex = -1;
                        const currentIndex = filteredItems.indexOf(filteredItem);
                        for (let i = currentIndex + 1; i < filteredItems.length; i++) {
                            if (filteredItems[i].mappedIndex > 0) {
                                filteredItems[i].mappedIndex--;
                            }
                        }
                    }
                });
            }, index => {
                filteredItems.splice(index, 1).forEach(filteredItem => {
                    filteredItem.unobserve?.();
                    if (filteredItem.mappedIndex >= 0) {
                        remove(filteredItem.mappedIndex);
                        for (let i = index; i < filteredItems.length; i++) {
                            if (filteredItems[i].mappedIndex > 0) {
                                filteredItems[i].mappedIndex--;
                            }
                        }
                    }
                });
            });
            return () => {
                destroy();
                filteredItems.forEach(filteredItem => filteredItem.unobserve?.());
            };
        });
    }

    /**
     * Create a stream that assigns an index, starting at 0, to eachitem in this stream.
     * The indices are cells that will update when items are removed.
     *
     * @returns A new stream.
     */
    get indexed(): CellStream<TItem, Cell<number>> {
        return new CellStreamWrapper((insert, remove) => {
            const indices: MutCell<number>[] = [];
            return this.observe((index, item) => {
                const indexCell = cell(index);
                if (index >= indices.length) {
                    indices.push(indexCell);
                } else {
                    indices.splice(index, 0, indexCell);
                    for (let i = index + 1; i < indices.length; i++) {
                        indices[i].value++;
                    }
                }
                insert(index, item, indexCell.asCell());
            }, index => {
                indices.splice(index, 1);
                remove(index);
                for (let i = index; i < indices.length; i++) {
                    indices[i].value--;
                }
            });
        });
    }
}

class CellStreamWrapper<TItem, TKey> extends CellStream<TItem, TKey> {
    constructor(
        private f: (
            insert: (index: number, item: Cell<TItem>, key: TKey) => void,
            remove: (index: number) => void,
        ) => () => void,
    ) {
        super()
    }

    observe(
        insert: (index: number, item: Cell<TItem>, key: TKey) => void,
        remove: (index: number) => void,
    ): () => void {
        return this.f(insert, remove);
    }
}

/**
 * A dynamic array of mutable cells.
 *
 * @category Cell streams and arrays
 */
export class CellArray<TItem> extends CellStream<TItem, void> {
    private readonly cells: MutCell<MutCell<TItem>[]> = cell(Array.from(this.initialItems).map(item => cell(item)));
    private _onInsert = createEmitter<{index: number, item: Cell<TItem>}>();
    private _onRemove = createEmitter<number>();

    /**
     * The number of items in the array.
     */
    readonly length = this.cells.map(cells => cells.length);

    /**
     * An emitter that emits events when items are inserted.
     */
    readonly onInsert: Emitter<{index: number, item: Cell<TItem>}> = this._onInsert.asEmitter();

    /**
     * An emitter that emits events when items are removed.
     */
    readonly onRemove: Emitter<number> = this._onRemove.asEmitter();

    /**
     * @param initialItems - The initial items of the array.
     */
    constructor(
        private initialItems: Iterable<TItem>,
    ) {
        super()
    }

    /**
     * All items of the array as mutable cells.
     */
    get items(): MutCell<TItem>[] {
        return this.cells.value;
    }

    observe(
        insert: (index: number, item: Cell<TItem>, key: void) => void,
        remove: (index: number) => void,
    ): () => void {
        this.cells.value.forEach((cell, index) => insert(index, cell));
        const unobserveInsert = this._onInsert.observe(({index, item}) => {
            insert(index, item);
        });
        const unobserveRemove = this._onRemove.observe(index => {
            remove(index);
        });
        return () => {
            unobserveInsert();
            unobserveRemove();
        };
    }

    /**
     * Find an item matching the predicate.
     *
     * @param predicate - A function to apply to each item.
     * @returns The mutable cell of the first item matching the predicate or
     * undefined if not found.
     */
    find(predicate: (item: TItem, index: number) => boolean): MutCell<TItem> | undefined {
        return this.cells.value.find((item, index) => predicate(item.value, index));
    }

    /**
     * Insert an item.
     *
     * @param index - The index to insert the item at. Existing items will be
     * moved over.
     * @param item - The item to insert.
     */
    insert(index: number, item: TItem): void {
        const c = cell(item);
        this.cells.update(cells => {
            cells.splice(index, 0, c);
            this._onInsert.emit({index, item: c});
        });
    }

    /**
     * Get the current cell value at the given index.
     *
     * @param index - The index.
     * @returns The item or undefined if out of bounds.
     */
    get(index: number): TItem | undefined {
        return this.cells.value[index]?.value;
    }

    /**
     * Set the value of the cell at the given index.
     *
     * @param index - The index.
     * @param item - The new cell value.
     */
    set(index: number, item: TItem): void {
        this.cells.value[index].value = item;
    }

    /**
     * Update the value of the cell at the given index.
     *
     * @param index - The index.
     * @param mutator - A function that modifies the value of the cell.
     * @returns If the `mutator` function returns a value, that value is
     * returned by `update` as well.
     */
    update<T>(index: number, mutator: (value: TItem) => T): T | undefined {
        return this.cells.value[index]?.update(mutator);
    }

    replaceAll(items: TItem[], predicate?: (existingItem: TItem, newItem: TItem) => boolean) {
        if (items.length < this.cells.value.length) {
            while (this.cells.value.length > items.length) {
                this.remove(this.cells.value.length - 1);
            }
        }
        for (let i = 0; i < this.cells.value.length; i++) {
            if (!predicate || predicate(this.cells.value[i].value, items[i])) {
                this.cells.value[i].value = items[i];
            }
        }
        for (let i = this.cells.value.length; i < items.length; i++) {
            this.push(items[i]);
        }
    }

    /**
     * Add an item to the end of the array increasing its length by one.
     *
     * When inserting items the order of events is as follows:
     *
     * 1. The item is inserted in the internal array of cells
     * 2. An insertion event is emitted to active iterators
     * 3. The {@link length} cell emits an update to observers
     *
     * @param item - The item to add to the end of the array
     */
    push(item: TItem): void {
        const index = this.length.value;
        const c = cell(item);
        this.cells.update(cells => {
            cells.push(c);
            this._onInsert.emit({index, item: c});
        });
    }

    pushAll(items: TItem[]): void {
        items.forEach(item => this.push(item));
    }

    remove(index: number): TItem | undefined {
        if (index >= 0 && index < this.cells.value.length) {
            const removed = this.cells.update(cells => cells.splice(index, 1)[0]);
            this._onRemove.emit(index);
            return removed.value;
        }
    }

    removeIf(predicate: (item: TItem, index: number) => boolean): void {
        for (let i = 0; i < this.cells.value.length; i++) {
            if (predicate(this.cells.value[i].value, i)) {
                this.cells.update(cells => cells.splice(i, 1))
                this._onRemove.emit(i);
                i--;
            }
        }
    }

    clear(): void {
        while (this.cells.value.length) {
            this.remove(this.cells.value.length - 1);
        }
    }
}

/**
 * @category Cell streams and arrays
 */
export class CellMap<TKey, TValue> extends CellStream<TValue, TKey> {
    private readonly cells: MutCell<Map<TKey, MutCell<TValue>>> = cell(new Map(Array.from(this.initialEntries).map(([key, value]) => [key, cell(value)])));
    private _onInsert = createEmitter<{key: TKey, value: Cell<TValue>}>();
    private _onDelete = createEmitter<TKey>();
    readonly size = this.cells.map(cells => cells.size);
    readonly onInsert = this._onInsert.asEmitter();
    readonly onDelete = this._onDelete.asEmitter();

    constructor(
        private initialEntries: Iterable<[TKey, TValue]> = [],
    ) {
        super();
    }

    get keys(): Iterable<TKey> {
        return this.cells.value.keys();
    }

    get values(): Iterable<MutCell<TValue>> {
        return this.cells.value.values();
    }

    get entries(): Iterable<[TKey, MutCell<TValue>]> {
        return this.cells.value.entries();
    }

    observe(
        insert: (index: number, item: Cell<TValue>, key: TKey) => void,
        remove: (index: number) => void,
    ): () => void {
        const keys: TKey[] = [];
        this.cells.value.forEach((cell, key) => {
            const index = keys.length;
            keys.push(key);
            insert(index, cell, key);
        });
        const unobserveInsert = this._onInsert.observe(({key, value}) => {
            const index = keys.length;
            keys.push(key);
            insert(index, value, key);
        });
        const unobserveRemove = this._onDelete.observe(key => {
            const index = keys.indexOf(key);
            if (index >= 0) {
                keys.splice(index, 1);
                remove(index);
            }
        });
        return () => {
            unobserveInsert();
            unobserveRemove();
        };
    }

    get(key: TKey): TValue | undefined {
        return this.cells.value.get(key)?.value;
    }

    update<T>(key: TKey, mutator: (value: TValue) => T): T | undefined {
        return this.cells.value.get(key)?.update(mutator);
    }

    set(key: TKey, value: TValue) {
        const existing = this.cells.value.get(key);
        if (existing) {
            existing.value = value;
        } else {
            const c = cell(value);
            this.cells.update(cells => cells.set(key, c));
            this._onInsert.emit({key, value: c});
        }
    }

    delete(key: TKey): boolean {
        if (this.cells.update(cells => cells.delete(key))) {
            this._onDelete.emit(key);
            return true;
        }
        return false;
    }

    clear(): void {
        this.cells.update(cells => {
            cells.forEach((_, key) => this._onDelete.emit(key));
            cells.clear();
        });
    }
}
