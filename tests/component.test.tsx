/** 
 * @jsx createElement
 * @jsxFrag Fragment
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { Cell, Fragment, cell, Component, Context, createElement, createEmitter, Deref, DocumentListener, Dynamic, ElementChildren, Lazy, Observe, ref, Show, Style, Switch, Unwrap, WindowListener } from '../src';
import { mountTest, numObservers } from './test-util';

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
        const init = vi.fn();
        const destroy = vi.fn();
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

describe('Switch', () => {
    it('shows correct branch', () => {
        const a = cell<{type: 'a', a: number} | {type: 'b', b: string}>({type: 'a', a: 5});

        const element = mountTest(
            <Switch with={a} on='type'>{{
                'a': a => <span>a: {a.props.a}</span>,
                'b': b => <span>b: {b.props.b}</span>,
            }}</Switch>
        );
        expect(element.container.textContent).toBe('a: 5');

        a.update(a => a.type === 'a' ? a.a = 10 : {});
        expect(element.container.textContent).toBe('a: 10');

        a.value = {type: 'b', b: 'foo'};
        expect(element.container.textContent).toBe('b: foo');

        element.destroy();

        expect(numObservers(a)).toBe(0);
    });

    it('shows else branch when not matched', () => {
        const a = cell<{type: 'a', a: number} | {type: 'b', b: {c: string}} | undefined>({type: 'a', a: 5});

        const observer = vi.fn();
        const element = mountTest(
            <Switch with={a} on='type' else='default'>{{
                'a': a => {
                    return <>
                        <Observe from={a} then={observer}/>
                        <span>a: {a.props.a}</span>
                    </>;
                },
                'b': b => <span>b: {b.props.b.props.c}</span>,
            }}</Switch>
        );
        expect(element.container.textContent).toBe('a: 5');

        expect(observer).toHaveBeenCalledTimes(0);

        a.value = {type: 'b', b: {c: 'foo'}};
        expect(element.container.textContent).toBe('b: foo');

        expect(observer).toHaveBeenCalledTimes(0);

        a.value = {type: 'a', a: 5};
        expect(element.container.textContent).toBe('a: 5');

        a.value = {type: 'b', b: {c: 'foo'}};
        expect(element.container.textContent).toBe('b: foo');

        a.value = undefined;
        expect(element.container.textContent).toBe('default');

        element.destroy();

        expect(numObservers(a)).toBe(0);
    });

    it('shows correct branch for enums', () => {
        const a = cell<'foo' | 'bar' | 'baz'>('foo');

        const element = mountTest(
            <Switch on={a}>{{
                'foo': <span>a is foo</span>,
                'bar': <span>a is bar</span>,
                'baz': <span>a is baz</span>,
            }}</Switch>
        );
        expect(element.container.textContent).toBe('a is foo');

        a.value = 'bar';
        expect(element.container.textContent).toBe('a is bar');

        element.destroy();

        expect(numObservers(a)).toBe(0);
    });

    it('shows else branch for enums when not matched', () => {
        const a = cell<'foo' | 'bar' | 'baz'>('foo');

        const element = mountTest(
            <Switch on={a} else={<span>default</span>}>{{
                'foo': <span>a is foo</span>,
            }}</Switch>
        );
        expect(element.container.textContent).toBe('a is foo');

        a.value = 'bar';
        expect(element.container.textContent).toBe('default');

        element.destroy();

        expect(numObservers(a)).toBe(0);
    });
});

describe('Deref', () => {
    it('shows value if defined, alternative otherwise', () => {
        const r = ref<string>();
        const element = mountTest(
            <Deref ref={r} else={'not defined'}>{x => x}</Deref>
        );
        expect(element.container.textContent).toBe('not defined');

        r.value = 'test';
        expect(element.container.textContent).toBe('test');

        r.value = 'test2';
        expect(element.container.textContent).toBe('test2');

        r.value = undefined;
        expect(element.container.textContent).toBe('not defined');

        element.destroy();

        r.value = 'test';
        expect(element.container.textContent).toBe('');

        expect(numObservers(r)).toBe(0);
    });

    it('destroys its subcontext', () => {
        const init = vi.fn();
        const destroy = vi.fn();
        let internalNumCell: Cell<number> | undefined;
        const Subcomponent = ({num}: {
            num: Cell<number>,
        }, context: Context) => {
            internalNumCell = num;
            context.onInit(init);
            context.onDestroy(destroy);
            return <div>Number: {num}</div>;
        };

        const num = ref<number>();
        const element = mountTest(
            <Deref ref={num}>{n =>
                <Subcomponent num={n}/>
            }</Deref>
        );
        expect(element.container.textContent).toBe('');

        num.value = 5;
        expect(element.container.textContent).toBe('Number: 5');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(0);

        num.value = 10;
        expect(element.container.textContent).toBe('Number: 10');

        num.value = undefined;
        expect(element.container.textContent).toBe('');
        expect(destroy).toHaveBeenCalledTimes(1);

        element.destroy();

        num.value = 5;
        expect(element.container.textContent).toBe('');

        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);

        expect(numObservers(num)).toBe(0);
        expect(numObservers(internalNumCell!)).toBe(0);
    });
});

describe('Unwrap', () => {
    it('shows value if defined, alternative otherwise', () => {
        const r = ref<string>();
        const element = mountTest(
            <Unwrap from={r} else={'not defined'}>{x => x}</Unwrap>
        );
        expect(element.container.textContent).toBe('not defined');

        r.value = 'test';
        expect(element.container.textContent).toBe('test');
        const child = element.container.childNodes[0];

        r.value = 'test2';
        expect(element.container.textContent).toBe('test2');
        expect(element.container.childNodes[0]).not.toBe(child);

        r.value = undefined;
        expect(element.container.textContent).toBe('not defined');

        element.destroy();

        r.value = 'test';
        expect(element.container.textContent).toBe('');

        expect(numObservers(r)).toBe(0);
    });

    it('destroys its subcontext', () => {
        const init = vi.fn();
        const destroy = vi.fn();
        let internalNumCell: Cell<number> | undefined;
        const Subcomponent = ({num}: {
            num: number,
        }, context: Context) => {
            internalNumCell = cell(num);
            context.onInit(init);
            context.onDestroy(destroy);
            return <div>Number: {num}</div>;
        };

        const num = ref<number>();
        const element = mountTest(
            <Unwrap from={num}>{n =>
                <Subcomponent num={n}/>
            }</Unwrap>
        );
        expect(element.container.textContent).toBe('');

        num.value = 5;
        expect(element.container.textContent).toBe('Number: 5');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(0);

        num.value = 10;
        expect(element.container.textContent).toBe('Number: 10');
        expect(init).toHaveBeenCalledTimes(2);
        expect(destroy).toHaveBeenCalledTimes(1);

        num.value = undefined;
        expect(element.container.textContent).toBe('');
        expect(destroy).toHaveBeenCalledTimes(2);

        element.destroy();

        num.value = 5;
        expect(element.container.textContent).toBe('');

        expect(init).toHaveBeenCalledTimes(2);
        expect(destroy).toHaveBeenCalledTimes(2);

        expect(numObservers(num)).toBe(0);
        expect(numObservers(internalNumCell!)).toBe(0);
    });
});

describe('Lazy', () => {
    it('shows child when resolved, alternative otherwise', async () => {
        const r = ref<string>();
        const element = mountTest(
            <Lazy else={'not defined'}>{() => r.toPromise()}</Lazy>
        );
        expect(numObservers(r)).toBe(1);
        expect(element.container.textContent).toBe('not defined');

        r.value = 'test';
        expect(numObservers(r)).toBe(0);
        await new Promise(r => setTimeout(r));
        expect(element.container.textContent).toBe('test');

        r.value = 'test2';
        expect(element.container.textContent).toBe('test');

        r.value = undefined;
        expect(element.container.textContent).toBe('test');

        element.destroy();

        r.value = 'test';
        expect(element.container.textContent).toBe('');
    });

    it('does not insert nodes after destruction', async () => {
        const r = ref<string>();
        const element = mountTest(
            <Lazy>{() => r.toPromise()}</Lazy>
        );
        expect(numObservers(r)).toBe(1);
        expect(element.container.textContent).toBe('');

        element.destroy();
        expect(element.container.textContent).toBe('');

        r.value = 'test';
        await new Promise(r => setTimeout(r));
        expect(element.container.textContent).toBe('');
    });

    it('destroys its subcontext', async () => {
        const init = vi.fn();
        const destroy = vi.fn();
        const Subcomponent = ({num}: {
            num: Cell<number>,
        }, context: Context) => {
            context.onInit(init);
            context.onDestroy(destroy);
            return <div>Number: {num}</div>;
        };

        const r = ref<string>();
        const num = cell(5);
        const element = mountTest(
            <Lazy>{() => r.toPromise().then(() =>
                <Subcomponent num={num}/>
            )}</Lazy>
        );
        expect(element.container.textContent).toBe('');

        r.value = 'test';
        await new Promise(r => setTimeout(r));
        expect(element.container.textContent).toBe('Number: 5');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(0);

        num.value = 10;
        expect(element.container.textContent).toBe('Number: 10');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(0);

        element.destroy();

        num.value = 5;
        expect(element.container.textContent).toBe('');

        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);

        expect(numObservers(num)).toBe(0);
    });

    it('handles errors', async () => {
        const onError = vi.fn();
        const element = mountTest(
            <Lazy onError={onError}>{() => Promise.reject('foo')}</Lazy>
        );
        await new Promise(r => setTimeout(r));
        expect(onError).toHaveBeenCalledWith('foo');
        element.destroy();
    });
});

describe('Dynamic', () => {
    it('shows component if defined, alternative otherwise', () => {
        const component = ref<Component<{num: Cell<number>, children: ElementChildren}>>();
        const num = cell(5);
        const element = mountTest(
            <Dynamic component={component} else={'not defined'} num={num}>
                test
            </Dynamic>
        );
        expect(element.container.textContent).toBe('not defined');

        component.value = props => {
            return <div>{props.children}: {props.num}</div>
        };
        expect(element.container.textContent).toBe('test: 5');

        num.value = 10;
        expect(element.container.textContent).toBe('test: 10');

        component.value = props => {
            return <div>{props.children}2: {props.num.map(x => x * 10)}</div>
        };
        expect(element.container.textContent).toBe('test2: 100');

        num.value = 20;
        expect(element.container.textContent).toBe('test2: 200');

        component.value = undefined;
        expect(element.container.textContent).toBe('not defined');

        element.destroy();

        component.value = () => <div>test</div>;
        expect(element.container.textContent).toBe('');

        expect(numObservers(num)).toBe(0);
        expect(numObservers(component)).toBe(0);
    });

    it('destroys its subcontext', () => {
        const init = vi.fn();
        const destroy = vi.fn();
        const Subcomponent = ({num}: {
            num: Cell<number>,
        }, context: Context) => {
            context.onInit(init);
            context.onDestroy(destroy);
            return <div>Number: {num}</div>;
        };

        const component = ref<Component<{num: Cell<number>, children: ElementChildren}>>();
        const num = cell(5);
        const element = mountTest(
            <Dynamic component={component} else={'not defined'} num={num}>
                test
            </Dynamic>
        );
        expect(element.container.textContent).toBe('not defined');

        component.value = props => {
            return <Subcomponent num={props.num}/>
        };
        expect(element.container.textContent).toBe('Number: 5');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(0);

        num.value = 10;
        expect(element.container.textContent).toBe('Number: 10');

        component.value = undefined;
        expect(element.container.textContent).toBe('not defined');
        expect(init).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);

        element.destroy();

        expect(numObservers(num)).toBe(0);
        expect(numObservers(component)).toBe(0);
    });
});

describe('Style', () => {
    it('sets style properties', () => {
        const div = document.createElement('div');

        const color = cell('blue');
        const backgroundColor = 'white';

        const element = mountTest(
            <Style color={color} backgroundColor={backgroundColor}>
                {() => div}
            </Style>
        );

        expect(div.style.color).toBe('blue');
        expect(div.style.backgroundColor).toBe('white');

        color.value = 'green';
        expect(div.style.color).toBe('green');

        element.destroy();

        color.value = 'red';
        expect(div.style.color).toBe('green');
    });
});

describe('createElement', () => {
    it('creates elements', () => {
        const element = mountTest(
            <h1>test</h1>
        );
        expect(element.container.children[0].tagName).toBe('H1');
        expect(element.container.children[0].textContent).toBe('test');
        element.destroy();
    });

    it('sets ref', () => {

        const elementRef = ref<HTMLHeadingElement>();
        const element = mountTest(
            <h1 ref={elementRef}>test</h1>
        );
        expect(element.container.children[0]).toBe(elementRef.value);
        element.destroy();

        expect(numObservers(elementRef)).toBe(0);
    });

    it('adds event listeners', () => {
        const onClick = vi.fn();
        const elementRef = ref<HTMLButtonElement>();
        const element = mountTest(
            <button ref={elementRef} onClick={onClick}>test</button>
        );

        elementRef.value?.click();
        expect(onClick).toHaveBeenCalledTimes(1);

        element.destroy();

        elementRef.value?.click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('sets style properties from string', () => {
        const elementRef = ref<HTMLDivElement>();
        const element = mountTest(
            <div ref={elementRef} style='color: blue; background-color: white;'>test</div>
        );

        expect(elementRef.value?.style.color).toBe('blue');
        expect(elementRef.value?.style.backgroundColor).toBe('white');

        element.destroy();
    });

    it('sets style properties from string cell', () => {
        const style = cell('color: blue; background-color: white;');
        const elementRef = ref<HTMLDivElement>();
        const element = mountTest(
            <div ref={elementRef} style={style}>test</div>
        );

        expect(elementRef.value?.style.color).toBe('blue');
        expect(elementRef.value?.style.backgroundColor).toBe('white');

        style.value = 'color: green;';
        expect(elementRef.value?.style.color).toBe('green');

        element.destroy();

        style.value = 'color: red;';
        expect(elementRef.value?.style.color).toBe('green');

        expect(numObservers(style)).toBe(0);
    });

    it('sets style properties from object', () => {
        const style = {
            color: cell('blue'),
            backgroundColor: 'white',
        };
        const elementRef = ref<HTMLDivElement>();
        const element = mountTest(
            <div ref={elementRef} style={style}>test</div>
        );

        expect(elementRef.value?.style.color).toBe('blue');
        expect(elementRef.value?.style.backgroundColor).toBe('white');

        style.color.value = 'green';
        expect(elementRef.value?.style.color).toBe('green');

        element.destroy();

        style.color.value = 'red';
        expect(elementRef.value?.style.color).toBe('green');

        expect(numObservers(style.color)).toBe(0);
    });

    it('sets class from string', () => {
        const elementRef = ref<HTMLDivElement>();
        const element = mountTest(
            <div ref={elementRef} class='foo'>test</div>
        );

        expect(elementRef.value?.className).toBe('foo');

        element.destroy();
    });

    it('sets class from string cell', () => {
        const classCell = cell('foo');
        const elementRef = ref<HTMLDivElement>();
        const element = mountTest(
            <div ref={elementRef} class={classCell}>test</div>
        );

        expect(elementRef.value?.className).toBe('foo');

        classCell.value = 'bar';
        expect(elementRef.value?.className).toBe('bar');

        element.destroy();

        classCell.value = 'baz';
        expect(elementRef.value?.className).toBe('bar');

        expect(numObservers(classCell)).toBe(0);
    });

    it('sets classes from object', () => {
        const classes = {
            foo: true,
            bar: false,
            baz: cell(false),
        };
        const elementRef = ref<HTMLDivElement>();
        const element = mountTest(
            <div ref={elementRef} class={classes}>test</div>
        );

        expect(elementRef.value?.className).toBe('foo');

        classes.baz.value = true;
        expect(elementRef.value?.classList.contains('baz')).toBe(true);
        expect(elementRef.value?.classList.contains('foo')).toBe(true);

        classes.baz.value = false;
        expect(elementRef.value?.classList.contains('baz')).toBe(false);

        element.destroy();

        classes.baz.value = true;
        expect(elementRef.value?.className).toBe('foo');

        expect(numObservers(classes.baz)).toBe(0);
    });

    it('sets attributes', () => {
        const value = cell('foo');
        const readOnly = cell(false);
        const elementRef = ref<HTMLInputElement>();
        const element = mountTest(
            <input ref={elementRef} minLength={0} required value={value} readOnly={readOnly} />
        );

        expect(elementRef.value?.minLength).toBe(0);
        expect(elementRef.value?.required).toBe(true);
        expect(elementRef.value?.readOnly).toBe(false);
        expect(elementRef.value?.value).toBe('foo');

        value.value = 'bar';
        expect(elementRef.value?.value).toBe('bar');

        readOnly.value = true;
        expect(elementRef.value?.readOnly).toBe(true);

        element.destroy();
        expect(numObservers(value)).toBe(0);
        expect(numObservers(readOnly)).toBe(0);
    });
});

describe('Observe', () => {
    it('observes an observable', () => {
        const emitter = createEmitter();
        const observer = vi.fn();

        const element = mountTest(
            <Observe from={emitter} then={observer}/>
        );

        emitter.emit(1);
        expect(observer).toHaveBeenCalledWith(1);
        expect(observer).toHaveBeenCalledTimes(1);

        element.destroy();

        emitter.emit(2);
        expect(observer).toHaveBeenCalledTimes(1);

        expect(numObservers(emitter)).toBe(0);
    });
});

describe('WindowListener', () => {
    it('adds an event listener', () => {
        const observer = vi.fn();

        const element = mountTest(
            <WindowListener on='click' then={observer}/>
        );

        const event = new MouseEvent('click');
        window.dispatchEvent(event)
        expect(observer).toHaveBeenCalledWith(event);
        expect(observer).toHaveBeenCalledTimes(1);

        element.destroy();

        window.dispatchEvent(new MouseEvent('click'))
        expect(observer).toHaveBeenCalledTimes(1);
    });
});

describe('DocumentListener', () => {
    it('adds an event listener', () => {
        const observer = vi.fn();

        const element = mountTest(
            <DocumentListener on='click' then={observer}/>
        );

        const event = new MouseEvent('click');
        document.dispatchEvent(event)
        expect(observer).toHaveBeenCalledWith(event);
        expect(observer).toHaveBeenCalledTimes(1);

        element.destroy();

        document.dispatchEvent(new MouseEvent('click'))
        expect(observer).toHaveBeenCalledTimes(1);
    });
});
