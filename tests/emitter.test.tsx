/** 
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { Emitter, cell, createEmitter, createInterval, createTimeout } from '../src';
import { numObservers } from './test-util';

describe('Emitter', () => {
    it('emits events to observers', () => {
        const emitter = createEmitter<number>();

        const observer = vi.fn();
        emitter.observe(observer);

        emitter.emit(5);
        expect(observer).toHaveBeenCalledWith(5);
        emitter.emit(10);
        expect(observer).toHaveBeenCalledWith(10);
        emitter.unobserve(observer);

        emitter.emit(15);
        expect(observer).toHaveBeenCalledTimes(2);

        expect(numObservers(emitter)).toBe(0);
    });

    it('can return the next event as a promise', async () => {
        const emitter = createEmitter<number>();
        const next = emitter.next();
        emitter.emit(5);
        expect(await next).toBe(5);

        expect(numObservers(emitter)).toBe(0);
    });

    it('can be mapped', () => {
        const emitter = createEmitter<number>();
        const mapped = emitter.map(x => x + 10);

        const observer = vi.fn();
        mapped.observe(observer);

        emitter.emit(5);
        expect(observer).toHaveBeenCalledWith(15);
        expect(observer).toHaveBeenCalledTimes(1);
        emitter.emit(10);
        expect(observer).toHaveBeenCalledWith(20);
        expect(observer).toHaveBeenCalledTimes(2);

        mapped.unobserve(observer);

        emitter.emit(15);
        expect(observer).toHaveBeenCalledTimes(2);

        expect(numObservers(emitter)).toBe(0);
        expect(numObservers(mapped)).toBe(0);
    });

    it('can be filtered', () => {
        const emitter = createEmitter<number>();
        const filtered = emitter.filter(x => x % 2 === 0);

        const observer = vi.fn();
        filtered.observe(observer);

        emitter.emit(5);
        expect(observer).toHaveBeenCalledTimes(0);
        emitter.emit(10);
        expect(observer).toHaveBeenCalledWith(10);
        expect(observer).toHaveBeenCalledTimes(1);

        filtered.unobserve(observer);

        emitter.emit(4);
        expect(observer).toHaveBeenCalledTimes(1);

        expect(numObservers(emitter)).toBe(0);
        expect(numObservers(filtered)).toBe(0);
    });

    it('can be indexed', () => {
        const emitter = createEmitter<number>();
        const indexed = emitter.indexed();

        const observer = vi.fn();
        indexed.observe(observer);

        emitter.emit(5);
        expect(observer).toHaveBeenCalledWith(0);
        expect(observer).toHaveBeenCalledTimes(1);
        emitter.emit(10);
        expect(observer).toHaveBeenCalledWith(1);
        expect(observer).toHaveBeenCalledTimes(2);

        indexed.unobserve(observer);

        emitter.emit(4);
        expect(observer).toHaveBeenCalledTimes(2);

        expect(numObservers(emitter)).toBe(0);
        expect(numObservers(indexed)).toBe(0);

        const indexed2 = emitter.indexed((event, index) => `${index}:${event}`);

        observer.mockReset();
        indexed2.observe(observer);

        emitter.emit(5);
        expect(observer).toHaveBeenCalledWith('0:5');

        emitter.emit(10);
        expect(observer).toHaveBeenCalledWith('1:10');

        emitter.emit(0);
        expect(observer).toHaveBeenCalledWith('2:0');
    });

    it('can be created from an observable', () => {
        const c = cell(5);
        const emitter = Emitter.from(c);

        const observer = vi.fn();
        emitter.observe(observer);

        c.value = 5;
        expect(observer).toHaveBeenCalledWith(5);
        expect(observer).toHaveBeenCalledTimes(1);

        c.value = 10;
        expect(observer).toHaveBeenCalledWith(10);
        expect(observer).toHaveBeenCalledTimes(2);

        emitter.unobserve(observer);

        c.value = 15;
        expect(observer).toHaveBeenCalledTimes(2);

        expect(numObservers(emitter)).toBe(0);
        expect(numObservers(c)).toBe(0);
    });
});

describe('IntervalEmitter', () => {
    vi.useFakeTimers();

    it('emits events', () => {
        const interval = createInterval(100);

        const observer = vi.fn();
        interval.observe(observer);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(2);

        interval.unobserve(observer);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(2);
    });

    it('can be started and stopped', () => {
        const interval = createInterval(100, false);

        const observer = vi.fn();
        interval.observe(observer);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(0);

        interval.start();

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(1);

        interval.stop();

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(1);

        interval.unobserve(observer);

        interval.start();

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(1);
    });
});

describe('TimeoutEmitter', () => {
    vi.useFakeTimers();

    it('emits events', () => {
        const timeout = createTimeout(100);

        const observer = vi.fn();
        timeout.observe(observer);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(1);

        timeout.unobserve(observer);
    });

    it('can be reset', () => {
        const timeout = createTimeout(100);

        const observer = vi.fn();
        timeout.observe(observer);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(1);

        timeout.reset();

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(2);

        timeout.reset();

        timeout.unobserve(observer);

        vi.advanceTimersByTime(100);
        expect(observer).toHaveBeenCalledTimes(2);
    });
});
