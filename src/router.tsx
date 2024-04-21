import { apply, createElement } from "./component";
import { Context, createValue } from "./context";
import { ref } from "./cell";
import { ElementChildren } from './types';

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
    Portal({}: {}): JSX.Element;
    Provider({children}: {children: ElementChildren}): JSX.Element;
    Link(props: {
        path: Path,
        children: ElementChildren,
    }): JSX.Element;
}

class HashRouter implements Router {
    private readonly currentElement = ref<JSX.Element>();

    constructor(private config: RouterConfig) {
    }

    async resolve(path: Path): Promise<JSX.Element | undefined> {
        if (typeof path === 'string') {
            path = path.split('/').filter(s => s);
        }
        path.push('');
        let route = this.config;
        let element: JSX.Element | Promise<JSX.Element> | undefined;
        let catchAll: JSX.Element | Promise<JSX.Element> | undefined;
        for (let i = 0; i < path.length; i++) {
            const p: string = path[i];
            if ('**' in route) {
                catchAll = (route as any)['**'](path.slice(i));
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
                    if (i === path.length - 2) {
                        element = r;
                    }
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

    async navigate(path: Path): Promise<void> {
        this.currentElement.value = await this.resolve(path);
        if (!this.currentElement.value) {
            throw new Error(`Route not found for path: ${path}`);
        }
        const pathString = pathToString(path);
        window.history.pushState({
            path
        }, document.title, `#${pathString}`);
    }

    readonly Portal = ({}: {}): JSX.Element => {
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
                subcontext = context.provide(ActiveRouter, this);
                apply(element, subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            };

            const onPopState = async (event: PopStateEvent) => {
                if (event.state?.path) {
                    this.currentElement.value = await this.resolve(event.state.path);
                }
            };

            const onHashChange = async () => {
                if (location.hash) {
                    this.currentElement.value = await this.resolve(location.hash.replace(/^#/, ''));
                } else {
                    this.currentElement.value = await this.resolve('');
                }
            };

            context.onInit(() => {
                this.currentElement.value = undefined;
                this.currentElement.getAndObserve(observer);
                window.addEventListener('popstate', onPopState);
                window.addEventListener('hashchange', onHashChange);
                onHashChange();
            });
            context.onDestroy(() => {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                childNodes.splice(0);
                this.currentElement.unobserve(observer);
                window.removeEventListener('popstate', onPopState);
                window.removeEventListener('hashchange', onHashChange);
                subcontext?.destroy();
            });
            return marker;
        };
    };

    Provider = ({children}: {children: JSX.Element|JSX.Element[]}) => {
        return <ActiveRouter.Provider value={this}>
            {children}
        </ActiveRouter.Provider>;
    };

    Link = (props: {
        path: Path,
        children: JSX.Element|JSX.Element[],
    }): JSX.Element => {
        const onClick = (event: MouseEvent) => {
            event.preventDefault();
            this.navigate(props.path);
        };
        return context => {
            const children = apply(props.children, context);
            children.forEach(child => {
                if (child instanceof HTMLAnchorElement) {
                    child.href = '#' + pathToString(props.path);
                    context.onInit(() => {
                        child.addEventListener('click', onClick);
                    });
                    context.onDestroy(() => {
                        child.removeEventListener('click', onClick);
                    });
                }
            });
            return children;
        };
    };
}

export function createRouter(config: RouterConfig): Router {
    return new HashRouter(config);
}

export function pathToString(path: Path): string {
    if (typeof path === 'string') {
        return path.split('/').filter(s => s).join('/');
    }
    return path.join('/');
}

export const ActiveRouter = createValue<Router|undefined>(undefined);

export function Link(props: {
    path: Path,
    children: JSX.Element|JSX.Element[],
}, context: Context) {
    const router = context.use(ActiveRouter);
    if (!router) {
        return <span>!NO ROUTER!</span>
    }
    return router.Link(props);
}
