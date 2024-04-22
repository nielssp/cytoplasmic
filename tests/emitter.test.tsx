import { Emitter } from '../src';

describe('Emitter', () => {
    it('emits events to observers', () => {
        const emitter = new Emitter<number>();

        const observer = jest.fn();
        emitter.observe(observer);

        emitter.emit(5);
        expect(observer).toHaveBeenCalledWith(5);
        emitter.emit(10);
        expect(observer).toHaveBeenCalledWith(10);
        emitter.unobserve(observer);

        emitter.emit(15);
        expect(observer).toHaveBeenCalledTimes(2);
    });

    it('can return the next event as a promise', () => {
        const emitter = new Emitter<number>();
        const next = emitter.next();
        emitter.emit(5);
        return expect(next).resolves.toBe(5);
    });
});
