import { Property } from "./component";

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
