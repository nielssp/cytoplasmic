// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { EventAttributes, HTMLAttributes } from "tsx-dom-types";
import { Cell, MutRefCell } from "./cell";

export type ElementChild = HTMLElement|string|number|Cell<string>|Cell<number>|JSX.Element|ElementChild[];

export type IntrinsicElementsHTML = {
    [TKey in keyof HTMLElementTagNameMap]?: EventAttributes<HTMLElementTagNameMap[TKey]> & ReactiveHTMLAttributes & {
        ref?: MutRefCell<HTMLElementTagNameMap[TKey]>;
        children?: ElementChild[]|ElementChild;
    }
};

type Attribute<T> = T | Cell<T>;

type StyleAttribute = Attribute<string | {
    [TKey in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[TKey]|Cell<CSSStyleDeclaration[TKey]>
}>;

type ClassAttribute = Attribute<string> | Record<string, Attribute<boolean>>;

type ReactiveHTMLAttributes = {
    [TKey in keyof HTMLAttributes]?: TKey extends 'style' ? StyleAttribute : TKey extends 'class' ? ClassAttribute : Attribute<HTMLAttributes[TKey]>;
};
