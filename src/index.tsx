// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { IntrinsicElementsHTML } from './types';

export * from './emitter';
export * from './property';
export * from './component';
export * from './list';
export * from './i18n';
export * from './form';
export * from './injector';
export * from './util';

declare global {
    namespace JSX {
        interface Context {
            onInit(initializer: () => void): void;
            onDestroy(destructor: () => void): void;
        }

        type Element = (context: Context) => Node|Node[];

        interface ElementAttributesProperty {
            props: unknown;
        }
        interface ElementChildrenAttribute {
            children: unknown;
        }

        type IntrinsicElements = IntrinsicElementsHTML;
    }
}
