/** 
 * @jsx createElement
 * @jest-environment jsdom
 */
import { Context, createValue, createElement } from '../src';
import { mountTest } from './test-util';

describe('Context', () => {
    it('runs initializers on initialization', () => {
        const context = new Context;

        const init1 = jest.fn();
        const init2 = jest.fn();

        context.onInit(init1);
        context.onInit(init2);

        expect(init1).toHaveBeenCalledTimes(0);
        expect(init2).toHaveBeenCalledTimes(0);

        context.init();
        expect(init1).toHaveBeenCalledTimes(1);
        expect(init2).toHaveBeenCalledTimes(1);

        const init3 = jest.fn();
        context.onInit(init3);
        expect(init3).toHaveBeenCalledTimes(1);
    });

    it('runs initializers on initialization', () => {
        const context = new Context;

        const destroy1 = jest.fn();

        context.onDestroy(destroy1);

        context.init();

        const destroy2 = jest.fn();
        context.onDestroy(destroy2);

        expect(destroy1).toHaveBeenCalledTimes(0);
        expect(destroy2).toHaveBeenCalledTimes(0);

        context.destroy();

        expect(destroy1).toHaveBeenCalledTimes(1);
        expect(destroy2).toHaveBeenCalledTimes(1);

        const destroy3 = jest.fn();
        context.onDestroy(destroy3);

        expect(destroy3).toHaveBeenCalledTimes(1);
    });

    it('provides values', () => {
        const context = new Context;

        const value1 = createValue(10);
        const value2 = createValue(100);

        expect(context.use(value1)).toBe(10);

        const subcontext = context.provide(value1, 15);

        expect(subcontext.use(value1)).toBe(15);
        expect(subcontext.use(value2)).toBe(100);

        const subsubcontext = subcontext.provide(value2, 200);

        expect(subsubcontext.use(value1)).toBe(15);
        expect(subsubcontext.use(value2)).toBe(200);

        expect(context.use(value1)).toBe(10);
    });
});

describe('createValue', () => {
    test('Provider', () => {
        const value = createValue(10);

        const element = mountTest(
            <value.Provider value={20}>
                a
                <value.Consumer>{v => {
                    expect(v).toBe(20);
                    return 'b';
                }}</value.Consumer>
                c
            </value.Provider>
        );

        expect(element.container.textContent).toBe('abc');
    });
    test('Consumer', () => {
        const value = createValue(10);

        const element = mountTest(
            <value.Consumer>{v => {
                expect(v).toBe(10);
                return 'test';
            }}</value.Consumer>
        );

        expect(element.container.textContent).toBe('test');
    });
});
