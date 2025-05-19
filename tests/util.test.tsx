/** 
 * @jsx createElement
 * @vitest-environment jsdom
 */
import { test, expect, vi } from 'vitest';
import { ariaBool, cell, noDefault, stopPropagation } from '../src';

test('noDefault', () => {
    const ev = new Event('');
    ev.preventDefault = vi.fn();
    const handler = vi.fn();
    noDefault(handler).call(document.createElement('div'), ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(ev);
});

test('stopPropagation', () => {
    const ev = new Event('');
    ev.stopPropagation = vi.fn();
    const handler = vi.fn();
    stopPropagation(handler).call(document.createElement('div'), ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(ev);
});

test('ariaBool', () => {
    const a = cell<any>(1);
    const b = ariaBool(a);
    expect(b.value).toBe('true');
    a.value = false;
    expect(b.value).toBe('false');
    a.value = true;
    expect(b.value).toBe('true');
});
