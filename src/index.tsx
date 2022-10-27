import { Property, ValueProperty } from './property';
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
