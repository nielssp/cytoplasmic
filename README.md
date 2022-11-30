# CSTK

CSTK is the "[Classic Stylesheets](https://github.com/nielssp/classic-stylesheets) Toolkit". It's intended as both a simple and (hopefully) performant JSX-based frontend TypeScript library based on [reactive programming](https://en.wikipedia.org/wiki/Reactive_programming), and a set of widgets, layouts and utilities for building traditional desktop GUIs for the web.

## Status

CSTK is still in the early experimental stages of development and may change or be abandoned at any time.

## Reactivity

```tsx
const a = bind(1);
const b = bind(2);
const c = zipWith([a, b], (a, b) => a + b);
console.log(c.value); // 3
a.value = 10
console.log(c.value); // 12
```

```tsx
function Counter() {
    const count = bind(0);
    return <div>
        <button onClick={() => count.value++}>
            Increment
        </button>
        <div>The count is {count}</div>
    </div>;
}
```

## Context values

```tsx
const Theme = createValue('light');

function App() {
    return <Theme.Provider value='dark'>
        <Toolbar/>
    </Theme.Provider>;
}

function Toolbar() {
    return <div>
        <Button label='Click me'/>
    </div>;
}

function Button({label}: {label: string}, context: Context) {
    const theme = context.use(Theme);
    return <button class={theme}>
        {label}
    </button>;
}
```

## Examples

- [Counter (7GUIs)](https://codesandbox.io/s/cstk-counter-7guis-jmugil?file=/index.tsx)
- [Temperature Converter (7GUIs)](https://codesandbox.io/s/cstk-temperature-converter-7guis-o0w7pg?file=/index.tsx)

