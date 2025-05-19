import { describe, it, test, expect, vi } from 'vitest';
import { $, Cell, cell, computed, constant, createEmitter, input, output, ref, zip, zipWith } from '../src';
import { numObservers } from './test-util';

describe('cell', () => {
    it('sets the initial value', () => {
        const a = cell('foo');
        expect(a.value).toBe('foo');
    });
    it('returns the input cell if mutable', () => {
        const a = cell('foo');
        const b = cell(a);
        expect(b.value).toBe('foo');
        expect(b).toBe(a);

        a.value = 'bar';
        expect(a.value).toBe('bar');
        expect(b.value).toBe('bar');

        b.value = 'baz';
        expect(a.value).toBe('baz');
        expect(b.value).toBe('baz');
    });
    it('copies the input cell value if immutable', () => {
        const a = cell('foo');
        const b = cell(a.asCell());
        expect(b.value).toBe('foo');
        expect(b).not.toBe(a);

        a.value = 'bar';
        expect(a.value).toBe('bar');
        expect(b.value).toBe('foo');

        b.value = 'baz';
        expect(a.value).toBe('bar');
        expect(b.value).toBe('baz');
    });
    it('can be created from an observable', () => {
        const emitter = createEmitter<number>();
        const a = Cell.from(emitter, 10);

        expect(a.value).toBe(10);

        const observer = vi.fn();
        a.observe(observer);

        emitter.emit(15);
        expect(observer).toHaveBeenCalledWith(15);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(a.value).toBe(15);

        a.unobserve(observer);

        emitter.emit(20);
        expect(observer).toHaveBeenCalledTimes(1);

        expect(numObservers(emitter)).toBe(0);
        expect(numObservers(a)).toBe(0);
    });
});

describe('input', () => {
    it('sets a constant value', () => {
        const a = input(42);
        expect(a.value).toBe(42);
    });
    it('returns the input cell', () => {
        const a = cell(42);
        const b = input(a);
        expect(b.value).toBe(42);
        expect(b).toBe(a);

        a.value = 9;
        expect(b.value).toBe(9);
    });
    it('returns the default value if input is null or undefined', () => {
        const a = input(undefined, 42);
        const b = input(null, 42);
        expect(a.value).toBe(42);
        expect(b.value).toBe(42);
    });
});

describe('output', () => {
    it('creates void output', () => {
        const out = output<number>(undefined);
        out(5);
    });
    it('creates function output', () => {
        const observer = vi.fn();
        const out = output<number>(observer);
        out(5);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(5);
        out(10);
        expect(observer).toHaveBeenCalledWith(10);
    });
    it('creates cell output', () => {
        const a = cell(42);
        const out = output<number>(a);
        out(5);
        expect(a.value).toBe(5);

        const observer = vi.fn();
        a.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        out(10);

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(10);

        a.unobserve(observer);

        expect(a.value).toBe(10);

        observer.mockClear()
        out(15);
        expect(observer).not.toHaveBeenCalled();
    });
    it('creates emitter output', () => {
        const a = createEmitter<number>();

        const observer = vi.fn();
        a.observe(observer);

        const out = output<number>(a);

        expect(observer).not.toHaveBeenCalled();

        out(5);

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(5);

        a.unobserve(observer);
        observer.mockClear()

        out(15);
        expect(observer).not.toHaveBeenCalled();
    });
});

describe('constant', () => {
    it('sets a constant value', () => {
        const a = constant('bar');
        expect(a.value).toBe('bar');
    });
    it('copies the input cell value', () => {
        const a = cell('bar');
        const b = constant(a);
        expect(b.value).toBe('bar');

        a.value = 'baz';
        expect(b.value).toBe('bar');
    });
});

describe('MutCellImpl', () => {
    it('notifies observers when changed', () => {
        const a = cell(0);

        const observer = vi.fn();
        a.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        a.value = 5;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(5);

        a.unobserve(observer);
        observer.mockClear()

        a.value = 3;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
    });
});

describe('$', () => {
    it('tracks dependencies', () => {
        const a = cell(1);
        const b = cell(2);
        const c = $(() => $(a) + $(b));

        expect(c.value).toBe(3);

        a.value = 2;

        expect(c.value).toBe(4);

        const observer = vi.fn();
        c.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        a.value = 5;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(7);

        c.unobserve(observer);
        observer.mockClear()

        a.value = 3;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
    });

    it('tracks changing dependencies', () => {
        const a = cell(true);
        const b = cell(1);
        const c = cell(2);
        const d = $(() => $(a) ? $(b) : $(c));

        expect(d.value).toBe(1);

        a.value = false;

        expect(d.value).toBe(2);

        const observer = vi.fn();
        d.observe(observer);

        a.value = true;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);

        b.value = 3;

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(3);

        c.value = 4;

        expect(observer).toHaveBeenCalledTimes(3);
        expect(observer).toHaveBeenCalledWith(3);

        a.value = false;

        expect(observer).toHaveBeenCalledTimes(4);
        expect(observer).toHaveBeenCalledWith(4);

        d.unobserve(observer);
        observer.mockClear()

        a.value = false;
        b.value = 1;
        c.value = 2;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
        expect(numObservers(d)).toBe(0);
    });
});

describe('computed', () => {
    it('tracks dependencies', () => {
        const a = cell(1);
        const b = cell(2);
        const c = computed(get => get(a) + get(b));

        expect(c.value).toBe(3);

        a.value = 2;

        expect(c.value).toBe(4);

        const observer = vi.fn();
        c.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        a.value = 5;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(7);

        c.unobserve(observer);
        observer.mockClear()

        a.value = 3;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
    });

    it('tracks changing dependencies', () => {
        const a = cell(true);
        const b = cell(1);
        const c = cell(2);
        const d = computed(get => get(a) ? get(b) : get(c));

        expect(d.value).toBe(1);

        a.value = false;

        expect(d.value).toBe(2);

        const observer = vi.fn();
        d.observe(observer);

        a.value = true;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);

        b.value = 3;

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(3);

        c.value = 4;

        expect(observer).toHaveBeenCalledTimes(3);
        expect(observer).toHaveBeenCalledWith(3);

        a.value = false;

        expect(observer).toHaveBeenCalledTimes(4);
        expect(observer).toHaveBeenCalledWith(4);

        d.unobserve(observer);
        observer.mockClear()

        a.value = false;
        b.value = 1;
        c.value = 2;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
        expect(numObservers(d)).toBe(0);
    });
});

describe('Cell', () => {
    test('getAndObserve', () => {
        const a = cell(42);

        const observer = vi.fn();

        a.getAndObserve(observer);

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(42);

        a.value = 9;

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(9);

        a.unobserve(observer);
        observer.mockClear()

        a.value = 3;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
    });

    test('map', () => {
        const a = cell(5);
        const b = a.map(x => x + 4);

        expect(b.value).toBe(9);

        const observer = vi.fn();
        b.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        a.value = 10;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(14);

        b.unobserve(observer);
        observer.mockClear()

        a.value = 3;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
    });

    test('mapDefined', () => {
        const a = cell<{foo: number} | undefined>({foo: 5});
        const b = a.mapDefined(x => x.foo + 5);

        expect(b.value).toBe(10);

        const observer = vi.fn();
        b.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        a.value = undefined;
        expect(b.value).toBe(undefined);

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(undefined);

        a.value = {foo: 10};

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(15);

        b.unobserve(observer);
        observer.mockClear()

        a.value = {foo: 2};

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
    });

    test('flatMap', () => {
        const a = cell(true);
        const b = cell(10);
        const c = cell(20);
        const d = a.flatMap(x => x ? b : c);

        expect(d.value).toBe(10);

        const observer = vi.fn();
        d.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        a.value = false;
        expect(d.value).toBe(20);

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(20);

        observer.mockClear()
        b.value = 11;
        expect(d.value).toBe(20);
        expect(observer).not.toHaveBeenCalled();

        c.value = 21;
        expect(d.value).toBe(21);

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(21);

        a.value = true;
        expect(d.value).toBe(11);

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(11);

        d.unobserve(observer);
        observer.mockClear()

        a.value = false;

        expect(observer).not.toHaveBeenCalled();

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
        expect(numObservers(d)).toBe(0);
    });

    test('toPromise', async () => {
        const a = ref<number>();
        const b = a.toPromise();
        const assertion = expect(b).resolves.toBe(5);
        a.value = 5;
        return assertion;
    });

    test('not', () => {
        const a = cell(10);
        const b = a.not;

        expect(b.value).toBe(false);

        a.value = 0;

        expect(b.value).toBe(true);
    });

    test('defined', () => {
        const a = ref<number>();
        const b = a.defined;

        expect(b.value).toBe(false);

        a.value = 0;

        expect(b.value).toBe(true);
    });

    test('defined', () => {
        const a = ref<number>();
        const b = a.undefined;

        expect(b.value).toBe(true);

        a.value = 0;

        expect(b.value).toBe(false);
    });

    test('eq', () => {
        const a = cell(5);
        const b = cell(6);
        const c = a.eq(b);
        const d = a.eq(6);

        expect(c.value).toBe(false);
        expect(d.value).toBe(false);

        a.value = 6;

        expect(c.value).toBe(true);
        expect(d.value).toBe(true);

        b.value = 5;

        expect(c.value).toBe(false);
    });

    test('and', () => {
        const a = cell(0);
        const b = cell(5);
        const d = a.and(b);

        expect(d.value).toBe(false);

        a.value = 1;

        expect(d.value).toBe(5);
    });

    test('or', () => {
        const a = cell(0);
        const b = cell(5);
        const d = a.or(b);

        expect(d.value).toBe(5);

        a.value = 1;

        expect(d.value).toBe(1);
    });

    test('props', () => {
        const a = cell({foo: 1, bar: 2});
        const b = a.props.foo;
        const c = a.props.bar;

        expect(b.value).toBe(1);
        expect(c.value).toBe(2);

        a.update(x => x.foo = 5);

        expect(b.value).toBe(5);
        expect(c.value).toBe(2);
    });

    test('orElse', () => {
        const a = ref<number>();
        const b = a.orElse(5);

        expect(b.value).toBe(5);

        a.value = 1;

        expect(b.value).toBe(1);
    });

    test('await', () => {
        const a = cell(Promise.resolve(1));
        const b = a.await(() => {});
        return expect(b.toPromise()).resolves.toBe(1);
    });

    test('cached', () => {
        const a = cell(5);

        const expensive = vi.fn(x => x + 1);

        const b = a.map(expensive);

        expect(b.value).toBe(6);
        expect(b.value).toBe(6);

        expect(expensive).toHaveBeenCalledTimes(2);

        const c = b.cached();
        expect(expensive).toHaveBeenCalledTimes(3);

        expect(c.value).toBe(6);
        expect(c.value).toBe(6);
        expect(expensive).toHaveBeenCalledTimes(5);

        const observer = vi.fn();
        c.observe(observer);

        expect(observer).not.toHaveBeenCalled();

        expect(c.value).toBe(6);
        expect(c.value).toBe(6);
        expect(expensive).toHaveBeenCalledTimes(6);

        a.value = 10;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(11);
        expect(expensive).toHaveBeenCalledTimes(7);

        expect(c.value).toBe(11);
        expect(expensive).toHaveBeenCalledTimes(7);

        c.unobserve(observer);
        observer.mockClear()

        a.value = 3;

        expect(observer).not.toHaveBeenCalled();

        expect(expensive).toHaveBeenCalledTimes(7);

        expect(c.value).toBe(4);
        expect(expensive).toHaveBeenCalledTimes(8);

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
    });
});

describe('ZippingCell', () => {
    it('zips inputs', () => {
        const a = cell(1);
        const b = cell(2);
        const c = cell(3);
        const d = zip(a, b, c);

        expect(d.value).toStrictEqual([1, 2, 3]);

        b.value = 5;

        expect(d.value).toStrictEqual([1, 5, 3]);

        const observer = vi.fn();

        d.observe(observer);

        c.value = 10;

        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith([1, 5, 10]);

        d.unobserve(observer)

        c.value = 15;

        expect(observer).toHaveBeenCalledTimes(1);

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
        expect(numObservers(c)).toBe(0);
        expect(numObservers(d)).toBe(0);
    });

    it('applies a function to the input values', () => {
        const a = cell(1);
        const b = cell(2);
        const c = cell(3);
        const d = zipWith([a, b, c], (a, b, c) => a + b + c);

        expect(d.value).toBe(6);

        a.value = 3;

        expect(d.value).toBe(8);
    });
});

describe('BimappingCell', () => {
    it('transcodes', () => {
        const a = cell(1);
        const b = a.bimap(
            x => String(x),
            y => parseInt(y),
        );

        expect(b.value).toBe('1');

        a.value = 2;

        expect(b.value).toBe('2');

        b.value = '3';

        expect(a.value).toBe(3);
    });

    it('observes the source', () => {
        const a = cell(1);
        const b = a.bimap(
            x => String(x),
            y => parseInt(y),
        );

        const observer = vi.fn();
        b.observe(observer);

        a.value = 2;

        expect(observer).toHaveBeenCalledWith('2');

        b.value = '3';

        expect(observer).toHaveBeenCalledWith('3');

        b.unobserve(observer)

        a.value = 4;

        expect(observer).toHaveBeenCalledTimes(2);

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
    });
});
