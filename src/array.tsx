// CSTK
// Copyright (c) 2024 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Cell, MutCell, cell } from './cell';
import { Emitter } from './emitter';

export function cellArray<TItem>(initialItems: Iterable<TItem> = []): CellArray<TItem> {
    return new CellArray(initialItems);
}

export function cellMap<TKey, TValue>(initialEntries: Iterable<[TKey, TValue]> = []): CellMap<TKey, TValue> {
    return new CellMap(initialEntries);
}

export interface CellIterable<TValue, TKey> {
    observe(
        insert: (index: number, item: TValue, key: TKey) => void,
        remove: (index: number) => void,
    ): () => void;
}

export abstract class CellStream<TItem, TKey> implements CellIterable<Cell<TItem>, TKey>  {
    abstract observe(
        insert: (index: number, item: Cell<TItem>, key: TKey) => void,
        remove: (index: number) => void,
    ): () => void;

    map<TOut>(f: (item: TItem, key: TKey) => TOut): CellStream<TOut, TKey> {
        return new CellStreamWrapper((insert, remove) => {
            return this.observe((index, item, key) => insert(index, item.map(v => f(v, key)), key), remove);
        });
    }

    mapKey<TOut>(f: (item: Cell<TItem>, key: TKey) => TOut): CellStream<TItem, TOut> {
        return new CellStreamWrapper((insert, remove) => {
            return this.observe((index, item, key) => insert(index, item, f(item, key)), remove);
        });
    }

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

export class CellArray<TItem> extends CellStream<TItem, void> {
    private readonly cells: MutCell<MutCell<TItem>[]> = cell(Array.from(this.initialItems).map(item => cell(item)));
    readonly length = this.cells.map(cells => cells.length);
    readonly onInsert = new Emitter<{index: number, item: Cell<TItem>}>();
    readonly onRemove = new Emitter<number>();

    constructor(
        private initialItems: Iterable<TItem>,
    ) {
        super()
    }

    get items(): MutCell<TItem>[] {
        return this.cells.value;
    }

    observe(
        insert: (index: number, item: Cell<TItem>, key: void) => void,
        remove: (index: number) => void,
    ): () => void {
        this.cells.value.forEach((cell, index) => insert(index, cell));
        const unobserveInsert = this.onInsert.observe(({index, item}) => {
            insert(index, item);
        });
        const unobserveRemove = this.onRemove.observe(index => {
            remove(index);
        });
        return () => {
            unobserveInsert();
            unobserveRemove();
        };
    }

    find(predicate: (item: TItem, index: number) => boolean): MutCell<TItem> | undefined {
        return this.cells.value.find((item, index) => predicate(item.value, index));
    }

    insert(index: number, item: TItem): void {
        const c = cell(item);
        this.cells.update(cells => cells.splice(index, 0, c));
        this.onInsert.emit({index, item: c});
    }

    get(index: number): TItem | undefined {
        return this.cells.value[index]?.value;
    }

    set(index: number, item: TItem): void {
        this.cells.value[index].value = item;
    }

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

    push(item: TItem): void {
        const index = this.length.value;
        const c = cell(item);
        this.cells.update(cells => cells.push(c));
        this.onInsert.emit({index, item: c});
    }

    pushAll(items: TItem[]): void {
        items.forEach(item => this.push(item));
    }

    remove(index: number): TItem | undefined {
        if (index >= 0 && index < this.cells.value.length) {
            const removed = this.cells.update(cells => cells.splice(index, 1)[0]);
            this.onRemove.emit(index);
            return removed.value;
        }
    }

    removeIf(predicate: (item: TItem, index: number) => boolean): void {
        for (let i = 0; i < this.cells.value.length; i++) {
            if (predicate(this.cells.value[i].value, i)) {
                this.cells.update(cells => cells.splice(i, 1))
                this.onRemove.emit(i);
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

export class CellMap<TKey, TValue> extends CellStream<TValue, TKey> {
    private readonly cells: MutCell<Map<TKey, MutCell<TValue>>> = cell(new Map(Array.from(this.initialEntries).map(([key, value]) => [key, cell(value)])));
    readonly size = this.cells.map(cells => cells.size);
    readonly onInsert = new Emitter<{key: TKey, value: Cell<TValue>}>();
    readonly onDelete = new Emitter<TKey>();

    constructor(
        private initialEntries: Iterable<[TKey, TValue]> = [],
    ) {
        super();
    }

    get values(): Iterable<MutCell<TValue>> {
        return this.cells.value.values();
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
        const unobserveInsert = this.onInsert.observe(({key, value}) => {
            const index = keys.length;
            keys.push(key);
            insert(index, value, key);
        });
        const unobserveRemove = this.onDelete.observe(key => {
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
            this.onInsert.emit({key, value: c});
        }
    }

    delete(key: TKey): boolean {
        if (this.cells.update(cells => cells.delete(key))) {
            this.onDelete.emit(key);
            return true;
        }
        return false;
    }

    clear(): void {
        this.cells.update(cells => {
            cells.forEach((_, key) => this.onDelete.emit(key));
            cells.clear();
        });
    }
}