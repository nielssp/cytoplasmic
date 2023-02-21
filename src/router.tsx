import { apply, createElement } from "./component";
import { Context, createValue } from "./context";
import { ref } from "./property";
import { ElementChild } from "./types";

export type RouterConfig = {
    [key: Exclude<string, '*' | '**'>]: RouterConfig | (() => JSX.Element | Promise<JSX.Element>);
} | {
    '*': (arg: string) => RouterConfig | JSX.Element | Promise<JSX.Element>;
} | {
    '**': (arg: string) => JSX.Element | Promise<JSX.Element>;
};

export type Path = string|string[];

export interface Router {
    resolve(path: Path): Promise<JSX.Element | undefined>;
    navigate(path: Path): Promise<void>;
    Portal: (props: {}) => JSX.Element;
}

export function createRouter(config: RouterConfig): Router {
    const currentElement = ref<JSX.Element>();
    async function resolve(path: Path): Promise<JSX.Element | undefined> {
        if (typeof path === 'string') {
            path = path.split('/').filter(s => s);
        }
        path.push('');
        let route = config;
        let element: JSX.Element | Promise<JSX.Element> | undefined;
        let catchAll: JSX.Element | Promise<JSX.Element> | undefined;
        for (let i = 0; i < path.length; i++) {
            const p: string = path[i];
            if ('**' in route) {
                catchAll = (route as any)['*'](path.slice(i));
            }
            if (p in route) {
                const r: RouterConfig | (() => JSX.Element | Promise<JSX.Element>) = (route as any)[p]
                if (typeof r === 'function') {
                    element = r();
                    break;
                } else {
                    route = r;
                }
            } else if ('*' in route) {
                const r: RouterConfig | JSX.Element | Promise<JSX.Element> = (route as any)['*'](p);
                if (typeof r === 'function' || r instanceof Promise) {
                    element = r;
                    break;
                } else {
                    route = r;
                }
            } else {
                break;
            }
        }
        if (!element) {
            element = catchAll;
        }
        return element;
    }
    async function navigate(path: Path): Promise<void> {
        currentElement.value = await resolve(path);
        if (!currentElement.value) {
            throw new Error(`Route not found for path: ${path}`);
        }
        const pathString = pathToString(path);
        window.history.pushState({
            path
        }, document.title, `#${pathString}`);
    }
    async function onPopState(event: PopStateEvent) {
        if (event.state?.path) {
            currentElement.value = await resolve(event.state.path);
        }
    }
    async function onHashChange() {
        if (location.hash) {
            currentElement.value = await resolve(location.hash.replace(/^#/, ''));
        } else {
            currentElement.value = await resolve('');
        }
    }
    function Portal({}: {}): JSX.Element {
        return context => {
            const marker = document.createComment('<Router.Portal>');
            const childNodes: Node[] = [];
            let subcontext: Context|undefined;
            const observer = (element: JSX.Element | undefined) => {
                if (subcontext) {
                    childNodes.forEach(node => node.parentElement?.removeChild(node));
                    childNodes.splice(0);
                    subcontext.destroy();
                }
                if (!element || !marker.parentElement) {
                    return;
                }
                const parent = marker.parentElement;
                subcontext = context.provide(ActiveRouter, router);
                apply(element, subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            };
            context.onInit(() => {
                currentElement.value = undefined;
                currentElement.getAndObserve(observer);
                window.addEventListener('popstate', onPopState);
                window.addEventListener('hashchange', onHashChange);
                onHashChange();
            });
            context.onDestroy(() => {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                childNodes.splice(0);
                currentElement.unobserve(observer);
                window.removeEventListener('popstate', onPopState);
                window.removeEventListener('hashchange', onHashChange);
                subcontext?.destroy();
            });
            return marker;
        };
    }
    const router = {resolve, navigate, Portal};
    return router;
}

export function pathToString(path: Path): string {
    if (typeof path === 'string') {
        return path.split('/').filter(s => s).join('/');
    }
    return path.join('/');
}

export const ActiveRouter = createValue<Router|undefined>(undefined);

export function Link({path, children}: {
    path: Path,
    children: ElementChild,
}, context: Context) {
    const router = context.use(ActiveRouter);
    if (!router) {
        return <span>!NO ROUTER!</span>
    }
    function onClick(event: MouseEvent) {
        event.preventDefault();
        router?.navigate(path);
    }
    return <a href={'#' + pathToString(path)} onClick={onClick}>{children}</a>
}
