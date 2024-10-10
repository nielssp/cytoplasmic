# Cytoplasmic

Cytoplasmic is a simple JSX-based frontend TypeScript library based on [reactive programming](https://en.wikipedia.org/wiki/Reactive_programming). Cytoplasmic provides a set of building blocks (reactive cells) and utilities for building web applications.

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

## Getting started

To set up a minimal Cytoplasmic project using [Vite](https://vitejs.dev/) for bundling, you can type the following commands:

```
npx degit nielssp/cytoplasmic/template my-app
cd my-app
npm install
npm run dev
```

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
import { createElement, mount} from 'cytoplasmic';

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
        <HelloName name='Cytoplasmic'/>
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

In the following component a `count` cell keeps track of the number of times the button is clicked:

```tsx
import { createElement, cell } from 'cytoplasmic';

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

Cells containing strings, numbers, and booleans can be used directly in JSX using `{cell}`-notation.

### Cell inputs and outputs

Accepting cells as properties in a component allows the component to react to state changes. The `Input<T>` type, which is an alias for `Cell<T> | T`, can be used to create components that work with both cells and raw values. To create a two-way binding a `MutCell<T>` can be used instead, this allows the component to send data back via the cell.

```tsx
// A component with two inputs
function Result(props: {
  a: Input<number>,
  b: Input<number>,
}) {
  // The input() utility is used to turn Input<T> into Cell<T>
  const a = input(props.a);
  const b = input(props.b);
  const out = zipWith([a, b], (a, b) => a + b);
  return <div>{out}</div>
}

// A component with a string input and a number output
function Incrementor({label, num}: {
  label: Input<string>,
  num: MutCell<number>,
}) {
  return <div>
      {label}: {num}
      <button onClick={() => num.value++}>
        +1
      </button>
  </div>;
}

function Adder() {
  const a = cell(0);
  const b = cell(0);
  return <div>
    <Incrementor label='A' num={a}/>
    <Incrementor label='B' num={b}/>
    <div>Result:</div>
    <Result a={a} b={b}/>
  </div>;
}
```

## Conditionally show elements

The `<Show>`-component can be used to conditionally show and hide elements:

```tsx
function ToggleSection() {
  const show = cell(false);
  return <div>
    <button onClick={() => show.value = !show.value}>
      Show
    </button>
    <Show when={show}>
      <div>
        Hello, World!
      </div>
    </Show>
  </div>;
}
```

The `else`-property can be used to show an alternative when the condition is false:

```tsx
<Show when={show} else={<div>{show} is false</div>}>
  <div>This is shown when {show} is true</div>
</Show>
```

The following utility methods make it easier to work with boolean cells:

* `a.not`: True when `a.value` is falsy, false otherwise
* `a.undefined`: True when `a.value` is null or undefined, false otherwise
* `a.defined`: Opposite of `undefined`
* `a.eq(b)`: True when `a.value` strictly equals `b.value` (`b` may also be a raw value), false otherwise
* `a.and(b)`: Same as `b.value` when `a.value` is truthy, false otherwise
* `a.or(b)`: Same as `a.value` when `a.value` is truthy, otherwise the same as `b.value`

`RefCell`s and `MutRefCell`s are cells that aren't guaranteed to contain a value, i.e. `.value` may be undefined. To handle such values the `<Deref>`-component can be used:

```tsx
function Foo() {
  // ref<T>() is a shorthand for cell<number | undefined>(undefined)
  const optionalNumber = ref<number>();
  return <div>
    <button onClick={() => optionalNumber.value = 5}>Set a number</button>

    <Deref ref={optionalNumber} else={<div>There is no number to show!</div>}>
      { n =>
        <div>The number is {n}</div>
      }
    </Deref>
  </div>
}
```

Deref expects a function that accepts a non-nullable cell and returns an element. The function is called only when the value of the RefCell is not undefined or null. The dereferenced value (`n` in the example above) is still a cell (type `Cell<number>`) however.

It's also possible to completely unwrap a cell (i.e. remove reactivity) using the `<Unwrap>`-component:


```tsx
function Foo() {
  const optionalNumber = ref<number>();
  return <div>
    <button onClick={() => optionalNumber.value = 5}>Set a number</button>

    <Unwrap from={optionalNumber} else={<div>There is no number to show!</div>}>
      { n =>
        <div>The number is {n}</div>
      }
    </Unwrap>
  </div>
}
```

In the above example the type of `n` is `number` as opposed to `Cell<number>` when using `Deref`. The difference between using `Unwrap` and `Deref` is that whenever the input to `Unwrap` changes, all DOM elements are recreated, whereas `Deref` will reuse the DOM elements and simply update the value of the cell.

## Looping

Looping is done using the `<For>` component:

```tsx
function ListWithStaticArray() {
  const items = [1, 2, 3, 4];
  return <For each={items}>{ item =>
    <div>Item: {item}</div>
  }</For>
}
```

It's possible to loop through an array contained within a cell:

```tsx
function ListWithArrayCell() {
  const items = cell([1, 2, 3, 4]);
  
  function addItem() {
    items.update(i => i.push(i.length + 1));
  }
  
  return <div>
    <For each={items}>{ item =>
      <div>Item: {item}</div>
    }</For>
    <button onClick={addItem}>Add an item</button>
  </div>
}
```

When the cell is updated the `For`-component will reuse existing DOM elements, but an update will be triggered for all items in the array. If you need to make lots of small modifications to an array you can use `cellArray()` instead:

```tsx
function ListWithCellArray() {
  const items = cellArray([1, 2, 3, 4]);
  
  function addItem() {
    items.push(items.length.value + 1);
  }
  
  return <div>
    <For each={items}>{ item =>
      <div>Item: {item}</div>
    }</For>
    <button onClick={addItem}>Add an item</button>
  </div>
}
```

In cell arrays each item is a cell which makes it possible to efficiently update the content of individual cells. Additionally removals and insertions are handled efficiently.

## Lazily loaded components

The `<Lazy>` component can be used to show components loaded lazily via the `import()`-function:

```tsx
<Lazy else='loading...'>{() => import('./my-component').then(m => <m.MyComponent/>)}</Lazy>
```

## Change component dynamically

The `<Dynamic>` can be used to render a component stored in a cell:

```tsx
const component = ref<Component<{}>>();

component.value = MyComponent;

<Dynamic component={component} else='no component'/>
```

This makes it possible to dynamically replace the rendered component with another one. Some possible uses are tab pages, modals, etc.

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

## I18n utilities

```
registerTranslationProvider(provider);
```

```
_('Hello, {world}!', {world: cell('World')})
```

```
_n('{n} item', '{n} items', {n: cell(5)})
```
