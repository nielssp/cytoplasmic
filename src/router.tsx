import { apply, createElement } from "./component";
import { Context, createValue } from "./context";
import { Cell, Input, RefCell, cell, input, ref } from "./cell";
import { ElementChildren } from './types';
import { Emitter, createEmitter } from './emitter';

/**
 * @category Routing
 */
export type RouterConfig = {
    [key: Exclude<string, '*' | '**'>]: RouterConfig | (() => JSX.Element | Promise<JSX.Element>);
} | {
    '*': (arg: string) => RouterConfig | JSX.Element | Promise<JSX.Element>;
} | {
    '**': (arg: string[]) => JSX.Element | Promise<JSX.Element>;
};

/**
 * @category Routing
 */
export type Path = string | string[];

/**
 * @category Routing
 */
export interface ActiveRoute {
    path: string[];
    route: string[];
    element: Promise<JSX.Element | undefined>;
}

/**
 * @category Routing
 */
export interface Router {
    strategy: RouterStategy;
    activeRoute: RefCell<ActiveRoute>;
    onNavigate: Emitter<ActiveRoute>;
    onNavigated: Emitter<ActiveRoute>;
    resolve(path: Path): ActiveRoute;
    navigate(path: Path, skipHistory?: boolean): Promise<void>;
    Portal({}: {}): JSX.Element;
    Provider({children}: {children: ElementChildren}): JSX.Element;
    Link(props: {
        path: Input<Path>,
        children: ElementChildren,
    }): JSX.Element;
}

export type RouterStategy = 'hash' | 'path';

class RouterImpl implements Router {
    private readonly currentElement = ref<JSX.Element>();
    private readonly _activeRoute = ref<ActiveRoute>();
    private readonly _onNavigate = createEmitter<ActiveRoute>();
    private readonly _onNavigated = createEmitter<ActiveRoute>();

    constructor(protected readonly config: RouterConfig, private readonly _strategy: RouterStategy) {
    }

    get strategy(): RouterStategy {
        return this._strategy;
    }

    get activeRoute(): RefCell<ActiveRoute> {
        return this._activeRoute.asCell();
    }

    get onNavigate(): Emitter<ActiveRoute> {
        return this._onNavigate.asEmitter();
    }

    get onNavigated(): Emitter<ActiveRoute> {
        return this._onNavigated.asEmitter();
    }

    protected toAbsolute(path: Path): string[] {
        let pathArray: string[];
        if (typeof path === 'string') {
            pathArray = path.split('/').filter(s => s);
        } else {
            pathArray = [...path];
        }
        if (pathArray.length && pathArray[0].startsWith('.')) {
            const current = [...this._activeRoute.value?.path ?? []];
            if (pathArray[0] === '.') {
                pathArray.shift();
                current.push(...pathArray);
            } else {
                while (pathArray[0] === '..') {
                    if (current.length) {
                        pathArray.shift();
                        current.pop();
                    } else {
                        console.error('Invalid relative path:', pathArray, 'current path:', this._activeRoute.value?.path);
                        return [];
                    }
                }
                current.push(...pathArray);
            }
            pathArray = current;
        }
        return pathArray;
    }

    resolve(path: Path): ActiveRoute {
        const absolute = this.toAbsolute(path);
        absolute.push('');
        let route = this.config;
        let element: JSX.Element | Promise<JSX.Element> | undefined;
        let catchAll: JSX.Element | Promise<JSX.Element> | undefined;
        let catchAllPath: string[] = [];
        let routePath: string[] = [];
        for (let i = 0; i < absolute.length; i++) {
            const p: string = absolute[i];
            if ('**' in route) {
                catchAll = (route as any)['**'](absolute.slice(i));
                catchAllPath = [...routePath, '**'];
            }
            if (p in route) {
                routePath.push(p);
                const r: RouterConfig | (() => JSX.Element | Promise<JSX.Element>) = (route as any)[p]
                if (typeof r === 'function') {
                    element = r();
                    break;
                } else {
                    route = r;
                }
            } else if ('*' in route) {
                routePath.push('*');
                const r: RouterConfig | JSX.Element | Promise<JSX.Element> = (route as any)['*'](p);
                if (typeof r === 'function' || r instanceof Promise) {
                    if (i === absolute.length - 2) {
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
            routePath = catchAllPath;
        }
        absolute.pop();
        return {
            path: absolute,
            route: routePath,
            element: element instanceof Promise ? element : Promise.resolve(element),
        };
    }

    private pathToString(path: Path): string {
        if (typeof path === 'string') {
            path = this.toAbsolute(path);
        }
        const pathString = pathToString(path);
        if (this.strategy === 'hash') {
            return `#${pathString}`;
        } else {
            return `/${pathString}`;
        }
    }

    async navigate(path: Path, skipHistory: boolean = false): Promise<void> {
        const route = this.resolve(path);
        if (!skipHistory) {
            window.history.pushState({
                path: route.path,
            }, document.title, this.pathToString(route.path));
        }
        this._activeRoute.value = route;
        this._onNavigate.emit(route);
        this.currentElement.value = await route.element;
        this._onNavigated.emit(route);
        if (!this.currentElement.value) {
            throw new Error(`Route not found for path: ${path}`);
        }
    }

    readonly Portal = ({}: {}): JSX.Element => {
        return context => {
            const parentRouter = context.use(ActiveRouter);
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
                subcontext = context.provide(ActiveRouter, parentRouter ?? this);
                apply(element, subcontext).forEach(node => {
                    parent.insertBefore(node, marker);
                    childNodes.push(node);
                });
                subcontext.init();
            };

            const onPopState = async (event: PopStateEvent) => {
                if (event.state?.path) {
                    await this.navigate(event.state.path, true);
                }
            };

            const onHashChange = async () => {
                if (location.hash) {
                    await this.navigate(location.hash.replace(/^#/, ''), true);
                } else {
                    await this.navigate('', true);
                }
            };

            const onParentNavigate = (route: ActiveRoute | undefined) => {
                if (route) {
                    const path = route.path.slice(route.route.length - 1);
                    this.navigate(path, true);
                }
            };

            context.onInit(async () => {
                this.currentElement.value = undefined;
                this.currentElement.getAndObserve(observer);
                if (parentRouter) {
                    parentRouter.activeRoute.getAndObserve(onParentNavigate);
                } else {
                    window.addEventListener('popstate', onPopState);
                    if (this.strategy === 'hash') {
                        window.addEventListener('hashchange', onHashChange);
                        onHashChange();
                    } else {
                        await this.navigate(location.pathname, true);
                    }
                }
            });
            context.onDestroy(() => {
                childNodes.forEach(node => node.parentElement?.removeChild(node));
                childNodes.splice(0);
                this.currentElement.unobserve(observer);
                if (parentRouter) {
                    parentRouter.activeRoute.unobserve(onParentNavigate);
                } else {
                    window.removeEventListener('popstate', onPopState);
                    if (this.strategy === 'hash') {
                        window.removeEventListener('hashchange', onHashChange);
                    }
                }
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
        path: Input<Path>,
        children: ElementChildren,
    }): JSX.Element => {
        const path = input(props.path);
        const onClick = (event: MouseEvent) => {
            event.preventDefault();
            this.navigate(path.value);
        };
        return context => {
            const children = apply(props.children, context);
            children.forEach(child => {
                if (child instanceof HTMLAnchorElement) {
                    context.onDestroy(path.getAndObserve(path => {
                        child.href = this.pathToString(path);
                    }));
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

/**
 * @category Routing
 */
export function createRouter(config: RouterConfig, strategy: RouterStategy = 'hash'): Router {
    return new RouterImpl(config, strategy);
}

/**
 * @category Routing
 */
export function pathToString(path: Path): string {
    if (typeof path === 'string') {
        return path.split('/').filter(s => s).join('/');
    }
    return path.join('/');
}

/**
 * @category Routing
 */
export const ActiveRouter = createValue<Router|undefined>(undefined);

/**
 * @category Routing
 */
export function Link(props: {
    path: Input<Path>,
    children: ElementChildren,
}, context: Context) {
    const router = context.use(ActiveRouter);
    if (!router) {
        return <span>ERROR: No router</span>
    }
    return router.Link(props);
}
