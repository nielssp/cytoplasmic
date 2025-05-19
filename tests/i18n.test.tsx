import { describe, it, test, expect, vi } from 'vitest';
import { DummyTranslationProvider, Emitter, Observable, _, _n, cell, registerTranslationProvider } from '../src';
import { numObservers } from './test-util';

describe('DummyTranslationProvider', () => {
    test('translate', () => {
        const a = new DummyTranslationProvider;

        expect(a.translate('', {})).toBe('');
        expect(a.translate('foo', {})).toBe('foo');
        expect(a.translate('Foo {foo} bar', {foo: 5})).toBe('Foo 5 bar');
        expect(a.translate('{bar} {foo} bar', {foo: 5, bar: 10})).toBe('10 5 bar');
    });

    test('translateNumeric', () => {
        const a = new DummyTranslationProvider;

        expect(a.translateNumeric('{n} item / {foo}', '{n} items / {foo}', {n: 1, foo: 5})).toBe('1 item / 5');
        expect(a.translateNumeric('{n} item / {foo}', '{n} items / {foo}', {n: -1, foo: 5})).toBe('-1 item / 5');
        expect(a.translateNumeric('{n} item / {foo}', '{n} items / {foo}', {n: 0, foo: 5})).toBe('0 items / 5');
        expect(a.translateNumeric('{n} item / {foo}', '{n} items / {foo}', {n: 5, foo: 5})).toBe('5 items / 5');
    });
});

class TestTranslationProvider extends DummyTranslationProvider {
    uppercase = cell(false);
    onLanguageChange = this.uppercase.map(() => undefined);

    protected getMessage(msgid: string, _parameters: Partial<Record<string, string | number>>): string | undefined {
        if (this.uppercase.value) {
            return msgid.toUpperCase();
        } else {
            return msgid.toLowerCase();
        }
    }
}

describe('_', () => {
    it('reacts to input changes', () => {
        const a = cell(5);
        const b = cell(10);
        const str = _('Foo {a} and {b} and {c}', {a, b, c: 15});

        expect(str.value).toBe('Foo 5 and 10 and 15');

        a.value = 7;

        expect(str.value).toBe('Foo 7 and 10 and 15');

        const observer = vi.fn();
        str.observe(observer);

        b.value = 12;
        expect(observer).toHaveBeenCalledWith('Foo 7 and 12 and 15');

        str.unobserve(observer);

        expect(numObservers(a)).toBe(0);
        expect(numObservers(b)).toBe(0);
    });

    it('reacts to language changes', () => {
        const provider = new TestTranslationProvider;
        const previous = registerTranslationProvider(provider);

        const str = _('Foobar');
        expect(str.value).toBe('foobar');

        const observer = vi.fn();
        str.observe(observer);

        provider.uppercase.value = true;
        expect(observer).toHaveBeenCalledWith('FOOBAR');

        str.unobserve(observer);

        expect(numObservers(provider.uppercase)).toBe(0);
        registerTranslationProvider(previous);
    });
});

describe('_n', () => {
    it('reacts to input changes', () => {
        const n = cell(5);
        const str = _n('Foo {n} and {c}', 'Foos {n} and {c}', {n, c: 15});

        expect(str.value).toBe('Foos 5 and 15');

        n.value = 1;

        expect(str.value).toBe('Foo 1 and 15');

        const observer = vi.fn();
        str.observe(observer);

        n.value = 2;
        expect(observer).toHaveBeenCalledWith('Foos 2 and 15');

        str.unobserve(observer);

        expect(numObservers(n)).toBe(0);
    });

    it('reacts to language changes', () => {
        const provider = new TestTranslationProvider;
        const previous = registerTranslationProvider(provider);

        const str = _n('Foobar', 'Foobars', {n: 1});
        expect(str.value).toBe('foobar');

        const observer = vi.fn();
        str.observe(observer);

        provider.uppercase.value = true;
        expect(observer).toHaveBeenCalledWith('FOOBAR');

        str.unobserve(observer);

        expect(numObservers(provider.uppercase)).toBe(0);
        registerTranslationProvider(previous);
    });
});
