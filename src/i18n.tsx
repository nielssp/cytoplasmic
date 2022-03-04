import { bind, Property } from "./component";

export type ContextValue = string|number|Property<string>|Property<number>;

export function _(msgid: string, context: Record<string, ContextValue> = {}): Property<string> {
    const prop = bind(msgid);
    let msg = msgid; // TODO: Translation here
    for (let key in context) {
        const value = context[key];
        if (value instanceof Property) {
            msg = msg.replace(`{${key}}`, '' + value.value);
            // TODO: map instead of observe
            value.observe(() => {
                let msg = msgid; // TODO: Translation here
                for (let key in context) {
                    const value = context[key];
                    if (value instanceof Property) {
                        msg = msg.replace(`{${key}}`, '' + value.value);
                    } else {
                        msg = msg.replace(`{${key}}`, '' + value);
                    }
                }
                prop.value = msg;
            });
        } else {
            msg = msg.replace(`{${key}}`, '' + value);
        }
    }
    prop.value = msg;
    return prop;
}

export function _n(
    msgid: string,
    msgidPlural: string,
    context: Record<string, ContextValue> & {n: number|Property<number>},
): Property<string> {
    const prop = bind(msgid);
    let msg = msgid; // TODO: Translation here
    const n = context.n;
    if (n instanceof Property ? n.value !== 1 && n.value !== -1 : n !== 1 && n !== -1) {
        msg = msgidPlural;
    }
    for (let key in context) {
        const value = context[key];
        if (value instanceof Property) {
            msg = msg.replace(`{${key}}`, '' + value.value);
            // TODO: map instead of observe
            value.observe(() => {
                let msg = msgid; // TODO: Translation here
                const n = context.n;
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
                prop.value = msg;
            });
        } else {
            msg = msg.replace(`{${key}}`, '' + value);
        }
    }
    prop.value = msg;
    return prop;
}
