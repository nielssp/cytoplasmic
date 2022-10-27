import { Property, ZippingProperty } from "./property";

export type ContextValue = string|number|Property<string>|Property<number>;

export function _(msgid: string, context: Record<string, ContextValue> = {}): Property<string> {
    const sources = Object.values(context).filter(source => source instanceof Property) as Property<any>[];
    return new ZippingProperty(sources, () => {
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
    return new ZippingProperty(sources, () => {
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
