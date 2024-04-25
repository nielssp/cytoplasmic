import { Cell, CellArray, Emitter, mount } from '../src';

export function numObservers(cell: Cell<any> | Emitter<any> | CellArray<any>): number {
    if (cell instanceof CellArray) {
        return numObservers((cell as any).cells)
            + numObservers((cell as any).onInsert)
            + numObservers((cell as any).onRemove)
            + cell.items.map(x => numObservers(x)).reduce((acc, x) => acc + x, 0);
    }
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


export function mountTest(element: JSX.Element): {container: HTMLDivElement, destroy: () => void} {
    const container = document.createElement('div');
    const destroy = mount(container, element);
    return {container, destroy};
}
