import { describe, test, expect, vi } from 'vitest';
import { Cell, cellArray, cellMap } from '../src';

describe('CellArray', () => {
    test('constructor', () => {
        const a = cellArray();
        const b = cellArray([1, 2, 3]);

        expect(a.length.value).toBe(0);
        expect(b.length.value).toBe(3);
        expect(b.items.map(x => x.value)).toStrictEqual([1, 2, 3]);
    });

    test('observe', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);
        expect(insert).toHaveBeenCalledWith(0, a.items[0]);
        expect(insert).toHaveBeenCalledWith(1, a.items[1]);
        expect(insert).toHaveBeenCalledWith(2, a.items[2]);

        unobserve();

        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(0);
    });

    test('find', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.find(x => x === 2);
        expect(b?.value).toBe(2);
    });

    test('insert', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        a.insert(0, 5);
        expect(a.length.value).toBe(4);
        expect(a.items.map(x => x.value)).toStrictEqual([5, 1, 2, 3]);

        expect(insert).toHaveBeenCalledWith(0, a.items[0]);

        unobserve();

        a.insert(2, 10);
        expect(a.items.map(x => x.value)).toStrictEqual([5, 1, 10, 2, 3]);

        expect(insert).toHaveBeenCalledTimes(4);
        expect(remove).toHaveBeenCalledTimes(0);
    });

    test('get', () => {
        const a = cellArray([1, 2, 3]);
        expect(a.get(1)).toBe(2);
    });

    test('set', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.items[1];
        a.set(1, 5);
        expect(a.get(1)).toBe(5);
        expect(b.value).toBe(5);
    });

    test('update', () => {
        const a = cellArray([{foo: 5}]);
        const b = a.items[0];
        a.update(0, x => x.foo = 10);
        expect(a.get(0)?.foo).toBe(10);
        expect(b.value.foo).toBe(10);
    });

    test('replaceAll', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.items[0];
        const c = a.items[2];

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        a.replaceAll([4, 5]);
        expect(a.length.value).toBe(2);
        expect(a.items.map(x => x.value)).toStrictEqual([4, 5]);
        expect(b.value).toBe(4);
        expect(c.value).toBe(3);

        expect(remove).toHaveBeenCalledWith(2);

        a.replaceAll([7, 8, 9, 10]);
        expect(a.length.value).toBe(4);
        expect(a.items.map(x => x.value)).toStrictEqual([7, 8, 9, 10]);
        expect(b.value).toBe(7);
        expect(c.value).toBe(3);

        expect(insert).toHaveBeenCalledWith(2, a.items[2]);
        expect(insert).toHaveBeenCalledWith(3, a.items[3]);

        a.replaceAll([10, 9, 8, 7], (o, n) => o < n);
        expect(a.items.map(x => x.value)).toStrictEqual([10, 9, 9, 10]);

        unobserve();
        expect(insert).toHaveBeenCalledTimes(5);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test('push', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        a.push(4);
        expect(a.length.value).toBe(4);
        expect(a.items.map(x => x.value)).toStrictEqual([1, 2, 3, 4]);

        expect(insert).toHaveBeenCalledWith(3, a.items[3]);

        unobserve();

        a.push(5);

        expect(insert).toHaveBeenCalledTimes(4);
        expect(remove).toHaveBeenCalledTimes(0);
    });

    test('pushAll', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        a.pushAll([4, 5]);
        expect(a.length.value).toBe(5);
        expect(a.items.map(x => x.value)).toStrictEqual([1, 2, 3, 4, 5]);

        expect(insert).toHaveBeenCalledWith(3, a.items[3]);
        expect(insert).toHaveBeenCalledWith(4, a.items[4]);

        unobserve();

        expect(insert).toHaveBeenCalledTimes(5);
        expect(remove).toHaveBeenCalledTimes(0);
    });

    test('remove', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        const b = a.remove(1);
        expect(b).toBe(2);
        expect(a.length.value).toBe(2);
        expect(a.items.map(x => x.value)).toStrictEqual([1, 3]);

        expect(remove).toHaveBeenCalledWith(1);

        unobserve();

        a.remove(0);

        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test('removeIf', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        a.removeIf(x => x <= 2);
        expect(a.length.value).toBe(1);
        expect(a.items.map(x => x.value)).toStrictEqual([3]);

        unobserve();
        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(2);
    });

    test('clear', () => {
        const a = cellArray([1, 2, 3]);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = a.observe(insert, remove);

        a.clear();
        expect(a.length.value).toBe(0);
        expect(a.items.map(x => x.value)).toStrictEqual([]);

        unobserve();
        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(3);
    });
});

describe('CellStream', () => {
    test('map', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.map(x => x + 10);

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = b.observe((i, c) => insert(i, c.value), remove);

        expect(insert).toHaveBeenCalledWith(0, 11);
        expect(insert).toHaveBeenCalledWith(1, 12);
        expect(insert).toHaveBeenCalledWith(2, 13);

        a.push(4);

        expect(insert).toHaveBeenCalledWith(3, 14);

        a.insert(0, 0);

        expect(insert).toHaveBeenCalledWith(0, 10);

        a.remove(1);
        expect(remove).toHaveBeenCalledWith(1);

        unobserve();

        a.push(5);
        a.remove(1);

        expect(insert).toHaveBeenCalledTimes(5);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test('indexed', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.indexed;

        const indices: Cell<number>[] = [];

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = b.observe((i, c, k) => {
            indices.splice(i, 0, k);
            insert(i, c.value, k.value);
        }, i => {
            indices.splice(i, 1);
            remove(i);
        });

        expect(insert).toHaveBeenCalledWith(0, 1, 0);
        expect(insert).toHaveBeenCalledWith(1, 2, 1);
        expect(insert).toHaveBeenCalledWith(2, 3, 2);

        a.push(4);

        expect(insert).toHaveBeenCalledWith(3, 4, 3);

        a.insert(0, 0);

        expect(insert).toHaveBeenCalledWith(0, 0, 0);
        expect(indices.map(x => x.value)).toStrictEqual([0, 1, 2, 3, 4]);

        a.remove(1);
        expect(remove).toHaveBeenCalledWith(1);
        expect(indices.map(x => x.value)).toStrictEqual([0, 1, 2, 3]);

        unobserve();

        a.push(5);
        a.remove(1);

        expect(insert).toHaveBeenCalledTimes(5);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test('mapKey', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.indexed.mapKey((_, key) => key.map(x => x + 10));

        const indices: Cell<number>[] = [];

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = b.observe((i, c, k) => {
            indices.splice(i, 0, k);
            insert(i, c.value, k.value);
        }, i => {
            indices.splice(i, 1);
            remove(i);
        });

        expect(insert).toHaveBeenCalledWith(0, 1, 10);
        expect(insert).toHaveBeenCalledWith(1, 2, 11);
        expect(insert).toHaveBeenCalledWith(2, 3, 12);

        a.push(4);

        expect(insert).toHaveBeenCalledWith(3, 4, 13);

        a.insert(0, 0);

        expect(insert).toHaveBeenCalledWith(0, 0, 10);
        expect(indices.map(x => x.value)).toStrictEqual([10, 11, 12, 13, 14]);

        a.remove(1);
        expect(remove).toHaveBeenCalledWith(1);
        expect(indices.map(x => x.value)).toStrictEqual([10, 11, 12, 13]);

        unobserve();

        a.push(5);
        a.remove(1);

        expect(insert).toHaveBeenCalledTimes(5);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test('filter', () => {
        const a = cellArray([1, 2, 3]);
        const b = a.indexed.filter(x => x % 2 === 0);

        const items: Cell<number>[] = [];
        const indices: Cell<number>[] = [];

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = b.observe((i, c, k) => {
            items.splice(i, 0, c);
            indices.splice(i, 0, k);
            insert(i, c.value, k.value);
        }, i => {
            items.splice(i, 1);
            indices.splice(i, 1);
            remove(i);
        });

        expect(insert).toHaveBeenCalledWith(0, 2, 1);

        a.push(4);
        // a: [1, 2, 3, 4] b: [2, 4]

        expect(insert).toHaveBeenCalledWith(1, 4, 3);

        a.push(5);
        // a: [1, 2, 3, 4, 5] b: [2, 4]
        expect(insert).toHaveBeenCalledTimes(2);

        a.insert(0, 0);
        // a: [0, 1, 2, 3, 4, 5] b: [0, 2, 4]

        expect(insert).toHaveBeenCalledWith(0, 0, 0);
        expect(items.map(x => x.value)).toStrictEqual([0, 2, 4]);
        expect(indices.map(x => x.value)).toStrictEqual([0, 2, 4]);

        a.remove(1);
        // a: [0, 2, 3, 4, 5] b: [0, 2, 4]
        expect(remove).toHaveBeenCalledTimes(0);
        expect(items.map(x => x.value)).toStrictEqual([0, 2, 4]);
        expect(indices.map(x => x.value)).toStrictEqual([0, 1, 3]);

        a.remove(1);
        // a: [0, 3, 4, 5] b: [0, 4]
        expect(remove).toHaveBeenCalledWith(1);
        expect(items.map(x => x.value)).toStrictEqual([0, 4]);
        expect(indices.map(x => x.value)).toStrictEqual([0, 2]);

        a.items[0].value = 1;
        // a: [1, 3, 4, 5] b: [4]
        expect(remove).toHaveBeenCalledWith(0);
        expect(items.map(x => x.value)).toStrictEqual([4]);
        expect(indices.map(x => x.value)).toStrictEqual([2]);

        a.items[3].value = 2;
        // a: [1, 3, 4, 2] b: [4, 2]
        expect(insert).toHaveBeenCalledWith(1, 2, 3);
        expect(items.map(x => x.value)).toStrictEqual([4, 2]);
        expect(indices.map(x => x.value)).toStrictEqual([2, 3]);

        a.items[3].value = 8;
        // a: [1, 3, 4, 8] b: [4, 8]
        expect(items.map(x => x.value)).toStrictEqual([4, 8]);
        expect(indices.map(x => x.value)).toStrictEqual([2, 3]);

        unobserve();

        a.push(6);
        a.remove(1);

        expect(insert).toHaveBeenCalledTimes(4);
        expect(remove).toHaveBeenCalledTimes(2);
    });
});

describe('CellMap', () => {
    test('constructor', () => {
        const map = cellMap(Object.entries({foo: 1, bar: 2, baz: 3}));

        expect(Array.from(map.keys)).toStrictEqual(['foo', 'bar', 'baz']);
        expect(Array.from(map.values).map(x => x.value)).toStrictEqual([1, 2, 3]);
        expect(Array.from(map.entries).map(([k, v]) => [k, v.value])).toStrictEqual([['foo', 1], ['bar', 2], ['baz', 3]]);
        expect(map.size.value).toBe(3);
    });

    test('observe', () => {
        const map = cellMap(Object.entries({foo: 1, bar: 2, baz: 3}));

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = map.observe(insert, remove);
        expect(insert).toHaveBeenCalledWith(0, Array.from(map.values)[0], 'foo');
        expect(insert).toHaveBeenCalledWith(1, Array.from(map.values)[1], 'bar');
        expect(insert).toHaveBeenCalledWith(2, Array.from(map.values)[2], 'baz');

        unobserve();

        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(0);
    });

    test('get', () => {
        const map = cellMap(Object.entries({foo: 1, bar: 2, baz: 3}));

        expect(map.get('foo')).toBe(1);
    });

    test('update', () => {
        const map = cellMap(Object.entries({foo: {bar: 2}}));

        map.update('foo', x => x.bar = 5);
        expect(map.get('foo')?.bar).toBe(5);
    });

    test('set', () => {
        const map = cellMap(Object.entries({foo: 1, bar: 2, baz: 3}));

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = map.observe(insert, remove);
        expect(insert).toHaveBeenCalledTimes(3);

        map.set('foo', 5);
        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(0);

        map.set('foobar', 10);
        expect(insert).toHaveBeenCalledWith(3, Array.from(map.values)[3], 'foobar');
        expect(insert).toHaveBeenCalledTimes(4);

        unobserve();

        expect(remove).toHaveBeenCalledTimes(0);
    });

    test('delete', () => {
        const map = cellMap(Object.entries({foo: 1, bar: 2, baz: 3}));

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = map.observe(insert, remove);
        expect(insert).toHaveBeenCalledTimes(3);

        expect(map.delete('bar')).toBe(true);
        expect(remove).toHaveBeenCalledWith(1);
        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(1);

        expect(map.delete('baz')).toBe(true);
        expect(remove).toHaveBeenCalledWith(1);
        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(2);

        expect(map.delete('baz')).toBe(false);

        unobserve();

        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(2);
    });

    test('clear', () => {
        const map = cellMap(Object.entries({foo: 1, bar: 2, baz: 3}));

        const insert = vi.fn();
        const remove = vi.fn();
        const unobserve = map.observe(insert, remove);
        expect(insert).toHaveBeenCalledTimes(3);

        map.clear();
        expect(remove).toHaveBeenCalledWith(0);

        unobserve();

        expect(insert).toHaveBeenCalledTimes(3);
        expect(remove).toHaveBeenCalledTimes(3);
    });
});
