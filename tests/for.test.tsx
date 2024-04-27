/** 
 * @jsx createElement
 * @jest-environment jsdom
 */

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

    it('traverses array cells', () => {
        const items = cell(['foo', 'bar', 'baz']);
        const a = cell(10);
        const element = mountTest(
            <For each={items}>{(item, index) =>
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

        element.destroy();

        items.update(x => x.push('foo'));
        expect(element.container.textContent).toBe('');

        expect(numObservers(items)).toBe(0);
        expect(numObservers(a)).toBe(0);
    });

    it('traverses cell arrays', () => {
        const items = cellArray(['foo', 'bar', 'baz']);
        const indexed = items.indexed;
        const a = cell(10);
        const element = mountTest(
            <For each={indexed}>{(item, index) =>
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

        element.destroy();

        items.push('foo');
        expect(element.container.textContent).toBe('');

        expect(numObservers(items)).toBe(0);
        expect(numObservers(a)).toBe(0);
    });
});
