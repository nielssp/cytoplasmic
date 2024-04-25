/** 
 * @jsx createElement
 * @jest-environment jsdom
 */
import { createRouter, createElement, cell, ActiveRouter, ref, pathToString, Link } from '../src';
import { mountTest, numObservers } from './test-util';

describe('HashRouter', () => {
    test('resolve', async () => {
        const routes = {
            root: <div/>,
            foo: <div/>,
            bar: <div/>,
            barX: <div/>,
            barXBaz: <div/>,
            notFound: <div/>,
        };
        const router = createRouter({
            '': () => routes.root,
            'foo': () => Promise.resolve(routes.foo),
            'bar': {
                '': () => routes.bar,
                '*': () => ({
                    '': () => routes.barX,
                    'baz': () => routes.barXBaz,
                })
            },
            '**': () => routes.notFound,
        });

        expect(await router.resolve('')).toBe(routes.root);
        expect(await router.resolve('foo')).toBe(routes.foo);
        expect(await router.resolve('bar')).toBe(routes.bar);
        expect(await router.resolve('bar/xyz')).toBe(routes.barX);
        expect(await router.resolve('bar/xyz/baz')).toBe(routes.barXBaz);
        expect(await router.resolve('bar/xyz/bar')).toBe(routes.notFound);
        expect(await router.resolve('baz')).toBe(routes.notFound);
    });

    test('navigate', async () => {
        const router = createRouter({
            '': () => <div/>,
            'foo': () => <div/>,
            '**': () => <div/>,
        });

        await router.navigate('');
        expect(window.location.hash).toBe('');

        await router.navigate('foo');
        expect(window.location.hash).toBe('#foo');

        await router.navigate('bar/baz/2');
        expect(window.location.hash).toBe('#bar/baz/2');
    });

    test('Portal', async () => {
        const a = cell(5);

        const router = createRouter({
            '': () => <div>root: {a}</div>,
            'bar': {
                '*': x => <div>bar: {x}</div>,
            },
            '**': () => <div>not found</div>,
        });

        window.location.hash = '';

        const element = mountTest(
            <router.Portal/>
        );

        await new Promise(r => setTimeout(r, 0));

        expect(element.container.textContent).toBe('root: 5');

        a.value = 10;

        expect(element.container.textContent).toBe('root: 10');

        await router.navigate('bar/foo');

        expect(element.container.textContent).toBe('bar: foo');
        expect(window.location.hash).toBe('#bar/foo');
        expect(numObservers(a)).toBe(0);

        window.location.hash = 'bar/baz';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        await new Promise(r => setTimeout(r, 0));
        expect(element.container.textContent).toBe('bar: baz');

        window.dispatchEvent(new PopStateEvent('popstate', {
            state: {
                path: 'bar/foobar',
            },
        }));
        await new Promise(r => setTimeout(r, 0));
        expect(element.container.textContent).toBe('bar: foobar');

        element.destroy();

        window.location.hash = 'bar/baz';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        await new Promise(r => setTimeout(r, 0));
        expect(element.container.textContent).toBe('');
    });

    test('Provider', () => {
        const router = createRouter({});

        const element = mountTest(
            <router.Provider>
                <ActiveRouter.Consumer>{activeRouter => {
                    expect(activeRouter).toBe(router);
                    return 'test';
                }}</ActiveRouter.Consumer>
            </router.Provider>
        );

        expect(element.container.textContent).toBe('test');
    });

    test('Link', async () => {
        const link = ref<HTMLAnchorElement>();

        const router = createRouter({
            '': () => <div>root</div>,
            'bar': {
                '*': x => <div>bar: {x}</div>,
            },
            '**': () => <div>not found</div>,
        });

        window.location.hash = '';

        const element = mountTest(
            <div>
                <router.Link path='bar/5'>
                    <a ref={link}>link</a>
                </router.Link>
                <router.Portal/>
            </div>
        );

        await new Promise(r => setTimeout(r, 0));

        expect(element.container.textContent).toBe('linkroot');

        link.value!.click();
        await new Promise(r => setTimeout(r, 0));

        expect(element.container.textContent).toBe('linkbar: 5');

        router.navigate('');

        element.destroy();
        
        link.value!.click();
        await new Promise(r => setTimeout(r, 0));

        expect(element.container.textContent).toBe('');
    });
});

test('pathToString', () => {
    expect(pathToString('//foo//bar/baz/')).toBe('foo/bar/baz');
    expect(pathToString(['foo', '5'])).toBe('foo/5');
});

describe('Link', () => {
    it('uses the active router', () => {
        const router = createRouter({});

        const element = mountTest(
            <router.Provider>
                <Link path='foo'>
                    <a>link</a>
                </Link>
            </router.Provider>
        );
        expect(element.container.textContent).toBe('link');
    });

    it('does not work without a router', () => {
        const element = mountTest(
            <Link path='foo'>
                <a>link</a>
            </Link>
        );
        expect(element.container.textContent).toBe('ERROR: No router');
    });
});
