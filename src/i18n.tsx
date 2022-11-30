// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Property, ZippingProperty } from "./property";

export type ParameterValue = string|number|Property<string>|Property<number>;

export function _(msgid: string, parameters: Record<string, ParameterValue> = {}): Property<string> {
    const sources = Object.values(parameters).filter(source => source instanceof Property) as Property<any>[];
    return new ZippingProperty(sources, () => {
        let msg = msgid;
        // TODO: translate
        for (let key in parameters) {
            const value = parameters[key];
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
    parameters: Record<string, ParameterValue> & {n: number|Property<number>},
): Property<string> {
    const sources = Object.values(parameters).filter(source => source instanceof Property) as Property<any>[];
    return new ZippingProperty(sources, () => {
        let msg = msgid;
        const n = parameters.n;
        // TODO: translate
        if (n instanceof Property ? n.value !== 1 && n.value !== -1 : n !== 1 && n !== -1) {
            msg = msgidPlural;
        }
        for (let key in parameters) {
            const value = parameters[key];
            if (value instanceof Property) {
                msg = msg.replace(`{${key}}`, '' + value.value);
            } else {
                msg = msg.replace(`{${key}}`, '' + value);
            }
        }
        return msg;
    });
}
