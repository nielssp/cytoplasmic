/** 
 * @jsx createElement
 * @jest-environment jsdom
 */

import { ariaBool, cell, noDefault, stopPropagation } from '../src';

test('noDefault', () => {
    const ev = new Event('');
    ev.preventDefault = jest.fn();
    const handler = jest.fn();
    noDefault(handler).call(document.createElement('div'), ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(ev);
});

test('stopPropagation', () => {
    const ev = new Event('');
    ev.stopPropagation = jest.fn();
    const handler = jest.fn();
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
