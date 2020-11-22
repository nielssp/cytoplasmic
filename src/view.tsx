import { Emitter } from "./emitter";
import { Panel } from "./component";
import { Injector, InjectableClass, InjectorCache } from "./injector";

export abstract class View extends Panel {
    private _title: string = '';
    private _loading: boolean = false;
    onTitleChanged = new Emitter<string>();
    onLoadingChanged = new Emitter<boolean>();

    get title() {
        return this._title;
    }

    set title(title: string) {
        this._title = title;
        this.onTitleChanged.emit(title);
    }

    get loading() {
        return this._loading;
    }

    set loading(loading: boolean) {
        this._loading = loading;
        this.onLoadingChanged.emit(loading);
    }
}

export class Router<T extends {'viewArgs': ViewArgs}> {
    static deps = ['injector', 'routerConfig'] as const;
    root: Route<T>;

    constructor(private injector: Injector<T>, config: RouterConfig<T>) {
        this.root = this.createRoutes(config);
    }

    createRoutes(config: RouterConfig<T>|LazyViewConstructor<T>, path: string = '/'): Route<T> {
        const route = new Route<T>();
        if (typeof config === 'function') {
            route.lazyViewConstructor = config;
        } else {
            for (let prop in config) {
                if (config.hasOwnProperty(prop)) {
                    if (prop === '') {
                        if (typeof config[''] === 'function') {
                            route.lazyViewConstructor = config[''];
                        } else {
                            throw new Error('Invalid view constructor for: ' + path);
                        }
                    } else if (prop.startsWith('$')) {
                        if (route.catchAll) {
                            throw new Error('Multiple placeholders in route: ' + path);
                        }
                        route.catchAll = this.createRoutes(config[prop], path + prop + '/');
                        route.catchAll.varName = prop.replace(/^\$/, '');
                    } else {
                        route.children[prop] = this.createRoutes(config[prop], path + prop + '/');
                    }
                }
            }
        }
        return route;
    }

    async resolve(path: Path): Promise<View|null> {
        if (typeof path === 'string') {
            path = path.split('/').filter(s => s);
        }
        let route = this.root;
        const args = new ViewArgs();
        for (let split of path) {
            if (route.children.hasOwnProperty(split)) {
                route = route.children[split];
            } else if (route.catchAll) {
                route = route.catchAll;
                if (route.varName) {
                    args.add(route.varName, split);
                }
            } else {
                console.warn(`route not found: ${path.join('/')}`);
                return null;
            }
        }
        if (!route.lazyViewConstructor) {
            console.warn(`no view for route: ${path.join('/')}`);
            return null;
        }
        try {
            if (!route.viewConstructor) {
                route.viewConstructor = await route.lazyViewConstructor();
            }
            return this.injector.inject(route.viewConstructor, {'viewArgs': args} as InjectorCache<T>);
        } catch (error) {
            console.error('Invalid args for route', path, error);
            return null;
        }
    }
}

export type Path = string|(string|number)[];

export function pathToString(path: Path): string {
    if (typeof path === 'string') {
        return path.split('/').filter(s => s).join('/');
    }
    return path.join('/');
}

export class ViewArgs {
    static deps = [] as const;

    private args: Record<string, string|number> = {};

    has(name: string): boolean {
        return this.args.hasOwnProperty(name);
    }

    add(name: string, value: string|number) {
        this.args[name] = value;
    }

    getString(name: string): string {
        if (this.args.hasOwnProperty(name)) {
            return this.args[name] + '';
        }
        throw new Error('Missing arg: ' + name);
    }

    getOptionalString(name: string): string|null {
        if (this.args.hasOwnProperty(name)) {
            return this.args[name] + '';
        }
        return null;
    }

    getInt(name: string): number {
        if (this.args.hasOwnProperty(name)) {
            const arg = this.args[name];
            if (typeof arg === 'number') {
                return arg;
            }
            const i = parseInt(arg);
            if (isNaN(i)) {
                throw new Error('Invalid arg: ' + name);
            }
            return i;
        }
        throw new Error('Missing arg: ' + name);
    }

    getFloat(name: string): number {
        if (this.args.hasOwnProperty(name)) {
            const arg = this.args[name];
            if (typeof arg === 'number') {
                return arg;
            }
            const f = parseFloat(arg);
            if (isNaN(f)) {
                throw new Error('Invalid arg: ' + name);
            }
            return f;
        }
        throw new Error('Missing arg: ' + name);
    }
}

export type ViewConstructor<T> = InjectableClass<T, View>;

class Route<T> {
    varName: string|null = null;
    lazyViewConstructor: LazyViewConstructor<T>|null = null;
    viewConstructor: ViewConstructor<T>|null = null;
    children: Record<string, Route<T>> = {};
    catchAll: Route<T>|null = null;
}

export type LazyViewConstructor<T> = () => ViewConstructor<T>|Promise<ViewConstructor<T>>;

export interface RouterConfig<T> {
    [propName: string]: RouterConfig<T>|LazyViewConstructor<T>;
}
