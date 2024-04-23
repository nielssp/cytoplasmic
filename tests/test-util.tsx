import { Cell } from '../src';

export function numObservers(cell: Cell<unknown>): number {
    const observers = (cell as any).observers;
    if (!observers) {
        return 0;
    } else if (observers instanceof Set) {
        return observers.size
    } else if (observers instanceof Map) {
        return observers.size
    } else {
        return observers.length;
    }
}

