// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { cell, MutCell, CellObserver, MutCellImpl } from "./cell";
import { apply } from "./component";
import { Context } from "./context";

let nextId = 0;

/**
 * Create a unique element id.
 *
 * @category Utilities
 */
export function createId(prefix: string): string {
    let id;
    do {
        id = `${prefix}${nextId}`;
        nextId++;
    } while (document.getElementById(id));
    return id;
}

/**
 * @category Form controls
 */
export abstract class Control<T> extends MutCell<T> {
    protected source: MutCell<T>;
    readonly disabled = cell(false);
    constructor(
        value: T|MutCell<T>,
        public readonly id: string = createId('control'),
    ) {
        super();
        this.source = cell(value);
    }

    get value(): T {
        return this.source.value;
    }

    set value(value: T) {
        this.source.value = value;
    }

    update<T2>(mutator: (value: T) => T2): T2 {
        return this.source.update(mutator);
    }

    updateDefined<T2>(mutator: (value: NonNullable<T>) => T2): T2 | undefined {
        return this.source.updateDefined(mutator);
    }

    observe(observer: CellObserver<T>): () => void {
        return this.source.observe(observer);
    }

    unobserve(observer: CellObserver<T>): void {
        this.source.unobserve(observer);
    }

    abstract addNode(element: Node, context: Context): void;
}


/**
 * @category Form controls
 */
export class CheckboxControl extends Control<boolean> {
    private inputs: HTMLElement[] = [];
    constructor(
        value: boolean|MutCell<boolean>,
        id?: string,
    ) {
        super(value, id);
    }

    addNode(element: Node, context: Context) {
        if (!(element instanceof HTMLElement)) {
            return;
        }
        switch (element.tagName) {
            case 'LABEL':
                (element as HTMLLabelElement).htmlFor = this.id;
                break;
            case 'INPUT':
                this.addCheckboxInput(element as HTMLInputElement, context);
                break;
        }
    }

    protected addCheckboxInput(input: HTMLInputElement, context: Context) {
        if (!this.inputs.length) {
            input.id = this.id;
        }
        this.inputs.push(input);
        context.onDestroy(this.getAndObserve(v => input.checked = v));
        const eventListener = () => this.value = input.checked;
        input.addEventListener('change', eventListener);
        context.onDestroy(() => input.removeEventListener('change', eventListener));
        context.onDestroy(this.disabled.getAndObserve(disabled => input.disabled = disabled));
        context.onDestroy(() => this.inputs.splice(this.inputs.indexOf(input), 1));
    }

    focus() {
        this.inputs.length && this.inputs[0].focus();
    }

    blur() {
        this.inputs.length && this.inputs[0].blur();
    }
}


/**
 * @category Form controls
 */
export abstract class TextInputControl<T> extends Control<T> {
    private inputs: (HTMLInputElement|HTMLTextAreaElement)[] = [];
    constructor(
        value: T|MutCell<T>,
        id?: string,
    ) {
        super(value, id);
    }

    abstract isValid(str: string): boolean;
    abstract stringify(value: T): string;
    abstract parse(str: string): T;

    addNode(element: Node, context: Context) {
        if (!(element instanceof HTMLElement)) {
            return;
        }
        switch (element.tagName) {
            case 'LABEL':
                (element as HTMLLabelElement).htmlFor = this.id;
                break;
            case 'INPUT':
                this.addTextInput(element as HTMLInputElement, context);
                break;
            case 'TEXTAREA':
                this.addTextInput(element as HTMLTextAreaElement, context);
                break;
        }
    }

    protected addTextInput(input: HTMLInputElement|HTMLTextAreaElement, context: Context) {
        if (!this.inputs.length) {
            input.id = this.id;
        }
        this.inputs.push(input);
        context.onDestroy(this.getAndObserve(value => {
            const str = this.stringify(value);
            if (str !== input.value) {
                input.value = str;
            }
        }));
        const inputListener = () => {
            const parsed = this.parse(input.value);
            if (this.value !== parsed) {
                this.value = parsed;
            }
        };
        input.addEventListener('input', inputListener);
        context.onDestroy(() => {
            input.removeEventListener('input', inputListener);
        });
        context.onDestroy(this.disabled.getAndObserve(disabled => input.disabled = disabled));
        context.onDestroy(() => this.inputs.splice(this.inputs.indexOf(input), 1));
    }

    focus() {
        this.inputs.length && this.inputs[0].focus();
    }

    blur() {
        this.inputs.length && this.inputs[0].blur();
    }
}


/**
 * @category Form controls
 */
export class TextControl extends TextInputControl<string> {
    constructor(
        value: string|MutCell<string>,
        id?: string,
    ) {
        super(value, id);
    }

    isValid(_: string): boolean {
        return true;
    }

    stringify(value: string): string {
        return value;
    }

    parse(str: string): string {
        return str;
    }
}


/**
 * @category Form controls
 */
export class IntControl extends TextInputControl<number> {
    min = Number.MIN_SAFE_INTEGER;
    max = Number.MAX_SAFE_INTEGER;

    constructor(
        value: number|MutCell<number>,
        id?: string,
    ) {
        super(value, id);
    }

    isValid(str: string): boolean {
        return !!str.match(/[0-9]+/);
    }

    stringify(value: number): string {
        return String(Math.floor(value));
    }

    parse(str: string): number {
        const m = str.match(/^[^0-9]*?(-?[0-9]+).*$/);
        if (m) {
            return Math.min(this.max, Math.max(this.min, parseInt(m[1], 10)));
        }
        return Math.min(this.max, Math.max(this.min, 0));
    }

    protected addTextInput(input: HTMLInputElement|HTMLTextAreaElement, context: Context) {
        super.addTextInput(input, context);
        if (input instanceof HTMLInputElement) {
            input.min = '' + this.min;
            input.max = '' + this.max;
        }
    }
}


/**
 * @category Form controls
 */
export class RadioControl<T extends string|number|symbol> extends Control<boolean> {
    private inputs: HTMLElement[] = [];
    constructor(
        private radioGroup: RadioGroup<T>,
        private radioValue: T,
        private readonly name: string,
        id?: string,
    ) {
        super(radioValue === radioGroup.value, id);
    }

    addNode(element: Node, context: Context) {
        if (!(element instanceof HTMLElement)) {
            return;
        }
        switch (element.tagName) {
            case 'LABEL':
                (element as HTMLLabelElement).htmlFor = this.id;
                break;
            case 'INPUT':
                this.addRadioInput(element as HTMLInputElement, context);
                break;
        }
    }

    protected addRadioInput(input: HTMLInputElement, context: Context) {
        if (!this.inputs.length) {
            input.id = this.id;
        }
        this.inputs.push(input);
        input.name = this.name;
        context.onDestroy(this.getAndObserve(v => {
            if (v) {
                this.radioGroup.value = this.radioValue;
            }
        }));
        context.onDestroy(this.radioGroup.getAndObserve(v => {
            if (v === this.radioValue) {
                input.checked = true;
            }
        }));
        const eventListener = () => {
            if (input.checked) {
                this.radioGroup.value = this.radioValue;
            }
        };
        input.addEventListener('change', eventListener);
        context.onDestroy(() => input.removeEventListener('change', eventListener));
        context.onDestroy(this.radioGroup.disabled.getAndObserve(disabled => input.disabled = disabled));
        context.onDestroy(() => this.inputs.splice(this.inputs.indexOf(input), 1));
    }

    focus() {
        this.inputs.length && this.inputs[0].focus();
    }

    blur() {
        this.inputs.length && this.inputs[0].blur();
    }
}


/**
 * @category Form controls
 */
export class RadioGroup<T extends string|number|symbol> extends MutCellImpl<T> {
    readonly disabled = cell(false);
    readonly radios = {} as Record<T, RadioControl<T>>;
    constructor(
        value: T,
        public readonly name: string = createId('radiogroup'),
    ) {
        super(value);
    }

    get(value: T): RadioControl<T> {
        if (!this.radios.hasOwnProperty(value)) {
            this.radios[value] = new RadioControl(this, value, this.name);
        }
        return this.radios[value];
    }
}


/**
 * @category Form controls
 */
export function Field(props: {
    children: JSX.Element|JSX.Element[],
    value: MutCell<string>|string,
} | {
    children: JSX.Element|JSX.Element[],
    control: Control<any>,
}): JSX.Element {
    return context => {
        const children = apply(props.children, context);
        const control = 'control' in props ? props.control : new TextControl(props.value);
        children.forEach(child => {
            control.addNode(child, context);
            if (child instanceof HTMLElement) {
                const nested = child.querySelectorAll('*');
                for (let i = 0; i < nested.length; i++) {
                    control.addNode(nested[i], context);
                }
            }
        });
        return children;
    };
}
