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

## Examples

- [Counter (7GUIs)](https://codesandbox.io/s/cstk-counter-7guis-jmugil?file=/index.tsx)
- [Temperature Converter (7GUIs)](https://codesandbox.io/s/cstk-temperature-converter-7guis-o0w7pg?file=/index.tsx)

## How to use

### Components

```tsx
import { createElement, mount} from 'cstk';

// A component without inputs
function HelloWorld() {
    return <div>Hello, World!</div>;
}

// A component with a required input
function HelloName({name}: {
    name: string,
}) {
    return <div>Hello, {name}!</div>;
}

// The main application component
function App() {
    return <div>
        <HelloWorld/>
        <HelloName name='CSTK'/>
    </div>;
}

// Attach application component to the body
mount(document.body, <App/>);
```

### Reactivity

* `bind()`
* `ref()`
* `zip()`
* `zipWith()`
* `bindList()`
* `p.getAndObserve()`
* `p.map()`
* `p.mapDefined()`
* `p.flatMap()`
* `p.not`
* `p.defined`
* `p.undefined`
* `p.eq()`
* `p.and()`
* `p.or()`
* `p.props`
* `p.orElse()`
* `p.await()`

###  Utilities

* `<Show>`
* `<Deref>`
* `<Unwrap>`
* `<Lazy>`
* `<Dynamic>`
* `<Style>`
* `<For>`

### Routing

* `createRouter()`
* `r.navigate()`
* `<r.Portal>`
* `<r.Provider>`
* `<r.Link>`
* `<Link>`

### Forms

* `<Field>`
* `CheckboxControl`
* `TextControl`
* `IntControl`
* `RadioControl`
* `RadioGroup`

### Context values

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

