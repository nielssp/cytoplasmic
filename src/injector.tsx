export type Token<TContext> = keyof TContext;

export interface InjectableClass<TContext, R> {
    new (...args: any[]): R;
    readonly deps: readonly (Token<TContext>|'injector')[];
}

export type Injectable<TContext, R> = { 'value': R } | { 'class': InjectableClass<TContext, R> }; 

export type Providers<TContext> = {
    [K in keyof TContext]: Injectable<TContext, TContext[K]>;
};

export type InjectorCache<TContext> = {
    [K in keyof TContext]?: TContext[K];
};

export type InjectorContext<T> = T extends Injector<infer TContext> ? TContext : never;

export class CircularDepedencyError extends Error {
    constructor(public path: string[] = []) {
        super('Circular dependency detected: ' + path.join(' -> '));
    }
}

function isValue<TContext, R>(injectable: Injectable<TContext, R>): injectable is { 'value': R } {
    return injectable.hasOwnProperty('value');
}

function isClass<TContext, R>(injectable: Injectable<TContext, R>): injectable is { 'class': InjectableClass<TContext, R> } {
    return injectable.hasOwnProperty('class');
}

export class Injector<TContext> {
    private cache: {[K in keyof TContext]?: TContext[K]|null} = {};

    constructor(private providers: Providers<TContext>) {
    }

    resolve<TKey extends keyof TContext>(name: TKey, alternatives: InjectorCache<TContext> = {}): TContext[TKey] {
        if (alternatives.hasOwnProperty(name)) {
            return alternatives[name]!;
        }
        if (!this.cache.hasOwnProperty(name)) {
            const provider = this.providers[name];
            if (isValue(provider)) {
                return provider.value;
            } else if (!isClass(provider)) {
                throw new Error('Unexpected provider type');
            }
            if (provider.class.deps.length) {
                this.cache[name] = null;
                try {
                    this.cache[name] = new provider.class(... provider.class.deps
                        .map(dep => {
                            if (dep === 'injector') {
                                return this;
                            }
                            return this.resolve(dep, alternatives);
                        }));
                } catch (error) {
                    if (error instanceof CircularDepedencyError) {
                        const path = error.path;
                        path.splice(0, 0, '' + name);
                        throw new CircularDepedencyError(path);
                    } else {
                        throw error;
                    }
                }
            } else {
                this.cache[name] = new provider.class();
            }
        }
        const obj = this.cache[name];
        if (!obj) {
            throw new CircularDepedencyError(['' + name]);
        }
        return obj!;
    }

    inject<R>(injectable: InjectableClass<TContext, R>, alternatives: InjectorCache<TContext> = {}): R {
        return new injectable(... injectable.deps
            .map(dep => {
                if (dep === 'injector') {
                    return this;
                }
                return this.resolve(dep, alternatives);
            }));
    }
}
