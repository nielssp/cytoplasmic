import { Property, PropertyObserver } from "./component";

export type ContextValue = string|number|Property<string>|Property<number>;

class TranslateProperty extends Property<string> {
    private observers: [PropertyObserver<string>, PropertyObserver<any>][] = [];

    constructor(private sources: Property<any>[], private translate: () => string) {
        super();
    }

    get value(): string {
        return this.translate();
    }

    observe(observer: PropertyObserver<string>): () => void {
        const sourceObserver = () => {
            observer(this.translate());
        };
        this.sources.forEach(source => source.observe(sourceObserver));
        this.observers.push([observer, sourceObserver]);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<string>): void {
        const i = this.observers.findIndex(([o, _]) => o === observer);
        if (i >= 0) {
            this.sources.forEach(source => source.unobserve(this.observers[i][1]));
            this.observers.splice(i, 1);
        }
    }
}

export function _(msgid: string, context: Record<string, ContextValue> = {}): Property<string> {
    const sources = Object.values(context).filter(source => source instanceof Property) as Property<any>[];
    return new TranslateProperty(sources, () => {
        let msg = msgid;
        // TODO: translate
        for (let key in context) {
            const value = context[key];
            if (value instanceof Property) {
                msg = msg.replace(`{${key}}`, '' + value.value);
            } else {
                msg = msg.replace(`{${key}}`, '' + value);
            }
        }
        return msg;
    });
}

export function _n(
    msgid: string,
    msgidPlural: string,
    context: Record<string, ContextValue> & {n: number|Property<number>},
): Property<string> {
    const sources = Object.values(context).filter(source => source instanceof Property) as Property<any>[];
    return new TranslateProperty(sources, () => {
        let msg = msgid;
        const n = context.n;
        // TODO: translate
        if (n instanceof Property ? n.value !== 1 && n.value !== -1 : n !== 1 && n !== -1) {
            msg = msgidPlural;
        }
        for (let key in context) {
            const value = context[key];
            if (value instanceof Property) {
                msg = msg.replace(`{${key}}`, '' + value.value);
            } else {
                msg = msg.replace(`{${key}}`, '' + value);
            }
        }
        return msg;
    });
}
