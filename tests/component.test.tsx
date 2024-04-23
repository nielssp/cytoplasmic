/** 
 * @jsx createElement
 * @jest-environment jsdom
 */
import { Cell, cell, Context, createElement, mount, Show } from '../src';
import { numObservers } from './test-util';

function mountTest(element: JSX.Element): {container: HTMLDivElement, destroy: () => void} {
    const container = document.createElement('div');
    const destroy = mount(container, element);
    return {container, destroy};
}

describe('Show', () => {
    it('shows child when statically true', () => {
        const element = mountTest(
            <Show when={true}>test</Show>
        );
        expect(element.container.textContent).toBe('test');
        element.destroy();
    });

    it('hides child when statically false', () => {
        const element = mountTest(
            <Show when={false}>test</Show>
        );
        expect(element.container.textContent).toBe('');
        element.destroy();
    });

    it('toggles child based on input change', () => {
        const condition = cell(false);
        const element = mountTest(
            <Show when={condition}>test</Show>
        );
        expect(element.container.textContent).toBe('');

        condition.value = true;
        expect(element.container.textContent).toBe('test');

        condition.value = true;
        expect(element.container.textContent).toBe('test');

        condition.value = false;
        expect(element.container.textContent).toBe('');

        element.destroy();

        condition.value = true;
        expect(element.container.textContent).toBe('');

        expect(numObservers(condition)).toBe(0);
    });

    it('shows alternative when false', () => {
        const condition = cell(false);
        const element = mountTest(
            <Show when={condition} else={'bar'}>foo</Show>
        );
        expect(element.container.textContent).toBe('bar');

        condition.value = true;
        expect(element.container.textContent).toBe('foo');

        condition.value = false;
        expect(element.container.textContent).toBe('bar');

        element.destroy();

        condition.value = true;
        expect(element.container.textContent).toBe('');

        expect(numObservers(condition)).toBe(0);
    });

    it('destroys its subcontext', () => {
        const init = jest.fn();
        const destroy = jest.fn();
        const Subcomponent = ({num}: {
            num: Cell<number>,
        }, context: Context) => {
            context.onInit(init);
            context.onDestroy(destroy);
            return <div>Number: {num}</div>;
        };

        const condition = cell(false);
        const num = cell(5);
        const element = mountTest(
            <Show when={condition}>
                <Subcomponent num={num}/>
            </Show>
        );
        expect(element.container.textContent).toBe('');

        condition.value = true;
        expect(element.container.textContent).toBe('Number: 5');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(0);

        num.value = 10;
        expect(element.container.textContent).toBe('Number: 10');

        condition.value = false;
        expect(element.container.textContent).toBe('');
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(numObservers(num)).toBe(0);

        element.destroy();

        condition.value = true;
        expect(element.container.textContent).toBe('');

        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);

        expect(numObservers(condition)).toBe(0);
        expect(numObservers(num)).toBe(0);
    });
});
