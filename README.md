# Cytoplasmic

Cytoplasmic is a simple JSX-based frontend TypeScript library based on [reactive programming](https://en.wikipedia.org/wiki/Reactive_programming). Cytoplasmic provides a set of building blocks (reactive cells) and utilies for building web applications.

Reactive programming in Cytoplasmic is implemented using cells. If you have ever used a spreadsheet, you should be familiar with how cells work:

```tsx
// Create two cells:
const a = cell(1);
const b = cell(2);
// Create a computed cell that uses a and b to compute a value:
const c = zipWith([a, b], (a, b) => a + b);
// Initially the value of c is 3:
console.log(c.value); // 3
// But if we change the value of one of the inputs, the value of c also changes:
a.value = 10
console.log(c.value); // 12
```

The API documentaion is available here: https://nielssp.github.io/cytoplasmic/

## Examples

- [Counter (7GUIs)](https://codesandbox.io/p/sandbox/shy-water-6j53j5)
- [Temperature Converter (7GUIs)](https://codesandbox.io/p/sandbox/objective-leavitt-2hw7hn)

## First component

Cytoplasmic allows you to create DOM-elements using JSX-syntax.

```tsx
import { createElement, mount } from 'cytoplasmic';

function HelloWorld() {
    return <h1>Hello, <strong style='color: blue;'>World</strong>!</h1>;
}

mount(document.body, <HelloWorld/>);
```

Use the `mount()` function to create an instance of your component and attach it to the DOM. `document.body` can be used as the root element if you want the entire page to be controlled by your Cytoplasmic component, but any DOM-element can be used as the root if you want to embed a Cytoplasmic component in an existing non-Cytoplasmic application.


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

## Cells

Cells are the reactive building blocks of Cytoplasmic components. There are immutable (`Cell<T>`) and mutable (`MutCell<T>`) cells.
To create a mutable cell simply call the function `cell(x)` where `x` is the cell's default content.
To get the current value of the cell the `value`-getter can be used.  For mutable cells, the value can be changed with the `value`-setter.

```tsx
const a = cell(1);
console.log(a.value); // 1
a.value = 2;
console.log(b.value); // 2
```

An important cell operator is `map()` which produces a dependent cell that changes whenever the source cell changes:

```tsx
const a = cell(1);
const b = a.map(x => x + 1);
console.log(b.value); // 2
a.value = 2;
console.log(b.value); // 3
```

To compute a value based on multiple source cells, `zip` and `zipWith` can be used:

```tsx
const a = cell(1);
const b = cell(2);
const c = zipWith([a, b], ([a, b]) => a + b);
console.log(c.value); // 3
a.value = 2;
console.log(c.value); // 4
```

### Using cells in components to manage state

```tsx
import { createElement } from 'cytoplasmic';

function ClickCounter() {
    const count = cell(0);
    return <div>
        <button onClick={() => count.value++}>
            Click me!
        </button>
        You've clicked the button {count} times
    </div>;
}

mount(document.body, <ClickCounter/>;
```

## Conditionally show elements

* `<Show>`
* `<Deref>`
* `<Unwrap>`

## Dynamically show elements

* `<Lazy>`
* `<Dynamic>`


## Looping

* `<For>`
* `cellArray()`
* `cellMap()`

## Utilities

* `<Style>`

## Routing

* `createRouter()`
* `r.navigate()`
* `<r.Portal>`
* `<r.Provider>`
* `<r.Link>`
* `<Link>`

## Forms

* `<Field>`
* `CheckboxControl`
* `TextControl`
* `IntControl`
* `RadioControl`
* `RadioGroup`

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

