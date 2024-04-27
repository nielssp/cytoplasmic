// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Cell, Input, input } from "./cell";

/**
 * Utility for preventing default event handling.
 *
 * @example
 * ```tsx
 * const onClick = e => console.log(e);
 * <button onClick={noDefault(onClick)}/>
 * ```
 *
 * @category Utilities
 */
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

/**
 * Utility for stopping event propagation.
 *
 * @example
 * ```tsx
 * const onClick = e => console.log(e);
 * <button onClick={stopPropagation(onClick)}/>
 * ```
 *
 * @category Utilities
 */
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

/**
 * Utilitiy cell that emits the strings "true" and "false" depending on whether
 * the input cell's value is true or false.
 *
 * @example
 * ```tsx
 * const selected = cell(true);
 *
 * <div aria-selected={ariaBool(selected)}/>
 * ```
 *
 * @category Utilities
 */
export function ariaBool(p: Input<any>): Cell<'true'|'false'> {
    return input(p).map(x => x ? 'true' : 'false');
}
