import { cell, constant, input } from '../src';

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
    });
});
