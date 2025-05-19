// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Context } from './context.js';
import { IntrinsicElementsHTML } from './types.js';

export * from './emitter.js';
export * from './cell.js';
export * from './component.js';
export * from './context.js';
export * from './array.js';
export * from './for.js';
export * from './i18n.js';
export * from './form.js';
export * from './router.js';
export * from './util.js';
export type { ElementChildren } from './types.js';

declare global {
    namespace JSX {
        type Element = (context: Context) => Node | Node[];

        interface ElementAttributesProperty {
            props: unknown;
        }
        interface ElementChildrenAttribute {
            children: unknown;
        }

        type IntrinsicElements = IntrinsicElementsHTML;
    }
}
