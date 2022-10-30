// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Property } from "./property";

export function noDefault<TEvent extends Event>(
    handler?: (this: HTMLElement, ev: TEvent) => void
): (this: HTMLElement, ev: TEvent) => void {
    return function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (handler) {
            handler.call(this, ev);
        }
    };
}

export function stopPropagation<TEvent extends Event>(
    handler?: (this: HTMLElement, ev: TEvent) => void
): (this: HTMLElement, ev: TEvent) => void {
    return function (ev) {
        ev.stopPropagation();
        if (handler) {
            handler.call(this, ev);
        }
    };
}

export function ariaBool(p: Property<any>): Property<'true'|'false'> {
    return p.map(x => x ? 'true' : 'false');
}
