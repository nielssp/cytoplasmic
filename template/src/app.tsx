import { createElement, cell } from 'cytoplasmic';

export function App() {
    const count = cell(0);

    return <div>
        <h1>Hello, World!</h1>
        <button onClick={() => count.value++}>
            count is {count}
        </button>
    </div>;
}
