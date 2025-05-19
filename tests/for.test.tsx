/** 
 * @jsx createElement
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { For, cell, cellArray, createElement } from '../src';
import { mountTest, numObservers } from './test-util';

describe('For', () => {
    it('traverses static arrays', () => {
        const a = cell(10);
        const element = mountTest(
            <For each={['foo', 'bar', 'baz']}>{(item, index) =>
                <div>{index}: {item} ({a})</div>
            }</For>
        );
        expect(element.container.textContent).toBe('0: foo (10)1: bar (10)2: baz (10)');

        a.value = 5;
        expect(element.container.textContent).toBe('0: foo (5)1: bar (5)2: baz (5)');

        element.destroy();
        expect(element.container.textContent).toBe('');
        expect(numObservers(a)).toBe(0);
    });
    it('traverses static maps', () => {
        const a = cell(10);
        const map = new Map();
        map.set('a', 'foo');
        map.set('b', 'bar');
        map.set('c', 'baz');
        const element = mountTest(
            <For each={map}>{([key, item], index) =>
                <div>{index}: {key}: {item} ({a})</div>
            }</For>
        );
        expect(element.container.textContent).toBe('0: a: foo (10)1: b: bar (10)2: c: baz (10)');

        a.value = 5;
        expect(element.container.textContent).toBe('0: a: foo (5)1: b: bar (5)2: c: baz (5)');

        element.destroy();
        expect(element.container.textContent).toBe('');
        expect(numObservers(a)).toBe(0);
    });

    it('shows else branch for empty static arrays', () => {
        const a = cell(10);
        const element = mountTest(
            <For each={[]} else={<div>empty {a}</div>}>{(item, index) =>
                <div>{index}: {item} ({a})</div>
            }</For>
        );
        expect(element.container.textContent).toBe('empty 10');

        a.value = 5;
        expect(element.container.textContent).toBe('empty 5');

        element.destroy();
        expect(element.container.textContent).toBe('');
        expect(numObservers(a)).toBe(0);
    });

    it('traverses array cells', () => {
        const items = cell(['foo', 'bar', 'baz']);
        const a = cell(10);
        const element = mountTest(
            <For each={items} else={<div>empty {a}</div>}>{(item, index) =>
                <div>{index}: {item} ({a})</div>
            }</For>
        );
        expect(element.container.textContent).toBe('0: foo (10)1: bar (10)2: baz (10)');

        items.update(x => x[0] = 'foobar');
        expect(element.container.textContent).toBe('0: foobar (10)1: bar (10)2: baz (10)');

        items.update(x => x.splice(2, 1));
        expect(element.container.textContent).toBe('0: foobar (10)1: bar (10)');

        a.value = 5;
        expect(element.container.textContent).toBe('0: foobar (5)1: bar (5)');

        items.update(x => x.splice(0, 1));
        expect(element.container.textContent).toBe('0: bar (5)');

        items.update(x => x.push('foo'));
        expect(element.container.textContent).toBe('0: bar (5)1: foo (5)');

        items.update(x => x.unshift('baz'));
        expect(element.container.textContent).toBe('0: baz (5)1: bar (5)2: foo (5)');

        items.update(x => x.splice(0));
        expect(element.container.textContent).toBe('empty 5');

        a.value = 10;
        expect(element.container.textContent).toBe('empty 10');

        items.update(x => x.push('baz'));
        expect(element.container.textContent).toBe('0: baz (10)');

        items.update(x => x.splice(0));
        expect(element.container.textContent).toBe('empty 10');

        element.destroy();

        items.update(x => x.push('foo'));
        expect(element.container.textContent).toBe('');

        expect(numObservers(items)).toBe(0);
        expect(numObservers(a)).toBe(0);
    });

    it('traverses map cells', () => {
        const items = cell(new Map([
            ['a', 'foo'],
            ['b', 'bar'],
            ['c', 'baz'],
        ]));
        const a = cell(10);
        const element = mountTest(
            <For each={items.map(i => i.values())} else={<div>empty {a}</div>}>{(item, index) =>
                <div>{index}: {item} ({a})</div>
            }</For>
        );
        expect(element.container.textContent).toBe('0: foo (10)1: bar (10)2: baz (10)');

        items.update(x => x.set('a', 'foobar'));
        expect(element.container.textContent).toBe('0: foobar (10)1: bar (10)2: baz (10)');

        items.update(x => x.delete('c'));
        expect(element.container.textContent).toBe('0: foobar (10)1: bar (10)');

        a.value = 5;
        expect(element.container.textContent).toBe('0: foobar (5)1: bar (5)');

        items.update(x => x.delete('a'));
        expect(element.container.textContent).toBe('0: bar (5)');

        items.update(x => x.set('d', 'foo'));
        expect(element.container.textContent).toBe('0: bar (5)1: foo (5)');

        items.update(x => x.clear());
        expect(element.container.textContent).toBe('empty 5');

        a.value = 10;
        expect(element.container.textContent).toBe('empty 10');

        items.update(x => x.set('a', 'baz'));
        expect(element.container.textContent).toBe('0: baz (10)');

        items.update(x => x.clear());
        expect(element.container.textContent).toBe('empty 10');

        element.destroy();

        items.update(x => x.set('a', 'foo'));
        expect(element.container.textContent).toBe('');

        expect(numObservers(items)).toBe(0);
        expect(numObservers(a)).toBe(0);
    });

    it('traverses cell arrays', () => {
        const items = cellArray(['foo', 'bar', 'baz']);
        const indexed = items.indexed;
        const a = cell(10);
        const element = mountTest(
            <For each={indexed} else={<div>empty {a}</div>}>{(item, index) =>
                <div>{index}: {item} ({a})</div>
            }</For>
        );
        expect(element.container.textContent).toBe('0: foo (10)1: bar (10)2: baz (10)');

        items.set(0, 'foobar');
        expect(element.container.textContent).toBe('0: foobar (10)1: bar (10)2: baz (10)');

        items.remove(2);
        expect(element.container.textContent).toBe('0: foobar (10)1: bar (10)');

        a.value = 5;
        expect(element.container.textContent).toBe('0: foobar (5)1: bar (5)');

        items.remove(0);
        expect(element.container.textContent).toBe('0: bar (5)');

        items.push('foo');
        expect(element.container.textContent).toBe('0: bar (5)1: foo (5)');

        items.insert(0, 'baz');
        expect(element.container.textContent).toBe('0: baz (5)1: bar (5)2: foo (5)');

        items.clear();
        expect(element.container.textContent).toBe('empty 5');

        a.value = 10;
        expect(element.container.textContent).toBe('empty 10');

        items.push('foo');
        expect(element.container.textContent).toBe('0: foo (10)');

        element.destroy();

        items.push('foo');
        expect(element.container.textContent).toBe('');

        expect(numObservers(items)).toBe(0);
        expect(numObservers(a)).toBe(0);
    });
});

