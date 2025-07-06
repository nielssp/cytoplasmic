import { Cell, createElement, createInterval } from 'cytoplasmic';

export function Timer(): JSX.Element {
    const interval = createInterval(1000);
    const count = Cell.from(interval.indexed().map(x => x + 1), 0);
    return <div>{count} seconds have passed</div>;
}
