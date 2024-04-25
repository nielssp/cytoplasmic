# Cytoplasmic changelog

## Unreleased

New features:

- `Observable<T>` as common base interface for emitters and cells
- New emitter class hierarchy, `Emitter<T>` renamed to `MutEmitter<T>`
- `emitter.map(f)`
- `emitter.filter(f)`
- `Emitter.from(observable)`
- `Cell.from(observable, initialValue)`
- `registerTranslationProvider(provider)`

New components:

- `<Observe from={observable} then={observer}/>`
- `<WindowListener on='event' then={listener}/>`
- `<DocumentListener on='event' then={listener}/>`

## Cytoplasmic 0.6.0

This is the initial release of Cytoplasmic. "Properties" have been renamed to "cells".

- `cell(initialValue)` replaces `bind()`
- `<Show>` now also works with static values
- `<For>` now also works with static arrays
- `cellArray(items)` and `cellMap(entries)` replace `bindList()`

## cstk 0.5.5

Fixed issues:

- null values not handled in Deref or Unwrap

New features:

- `property.toPromise()`

## cstk 0.5.4

New features:

- `property.updateDefined()`

## cstk 0.5.3

New features:

- `property.update()`

## cstk 0.5.0

New features:

- `<Lazy>`

## cstk 0.4.0

New features:

- `createValue()`
- `createRouter()`

## cstk 0.3.0

New features:

- `x.bimap(encode, decode)` on properties

## cstk 0.2.0

New features:

- `ref={x}` on HTML elements
- `ref<T>()`
- `<Deref>`
- `x.eq(y: T|Property<T>)` on properties
- `class={{classA: propA, classB: propB}}` on HTML elements
- `x.props.propName` on properties
- `x.mapDefined(f)` on properties
- `x.orElse(alternative)` on properties
- `x.await(onrejected)` on properties
- `<Unwrap>`

## cstk 0.1.1

Fixed issues:

- Missing exports
