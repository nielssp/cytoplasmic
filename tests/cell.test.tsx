import { $, Cell, cell, constant, input, ref } from '../src';

function numObservers(cell: Cell<unknown>): number {
    const observers = (cell as any).observers;
    if (!observers) {
        return 0;
    } else if (observers instanceof Set) {
        return observers.size
    } else if (observers instanceof Map) {
        return observers.size
    } else {
        return observers.length;
    }
}

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

        const observer = jest.fn();
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

        const observer = jest.fn();
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
});

describe('Cell', () => {
    test('getAndObserve', () => {
        const a = cell(42);

        const observer = jest.fn();

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

        const observer = jest.fn();
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

        const observer = jest.fn();
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

        const observer = jest.fn();
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
});
