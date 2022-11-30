// CSTK
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { bind, ValueProperty, PropertyObserver, SettableValueProperty } from "./property";
import { apply } from "./component";
import { Context } from "./context";

let nextId = 0;

export function createId(prefix: string): string {
    let id;
    do {
        id = `${prefix}${nextId}`;
        nextId++;
    } while (document.getElementById(id));
    return id;
}

export abstract class Control<T> extends ValueProperty<T> {
    protected source: ValueProperty<T>;
    readonly disabled = bind(false);
    constructor(
        value: T|ValueProperty<T>,
        public readonly id: string = createId('control'),
    ) {
        super();
        this.source = bind(value);
    }

    get value(): T {
        return this.source.value;
    }

    set value(value: T) {
        this.source.value = value;
    }

    observe(observer: PropertyObserver<T>): () => void {
        return this.source.observe(observer);
    }

    unobserve(observer: PropertyObserver<T>): void {
        this.source.unobserve(observer);
    }

    abstract add(element: Node, context: Context): void;
}

export class CheckboxControl extends Control<boolean> {
    private inputs: HTMLElement[] = [];
    constructor(
        value: boolean|ValueProperty<boolean>,
        id?: string,
    ) {
        super(value, id);
    }

    add(element: Node, context: Context) {
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
        this.inputs.length && this.inputs[0].focus();
    }
}

export abstract class TextInputControl<T> extends Control<T> {
    private inputs: (HTMLInputElement|HTMLTextAreaElement)[] = [];
    constructor(
        value: T|ValueProperty<T>,
        id?: string,
    ) {
        super(value, id);
    }

    abstract isValid(str: string): boolean;
    abstract stringify(value: T): string;
    abstract parse(str: string): T;

    add(element: Node, context: Context) {
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
        let focus = false;
        let interval: number|undefined;
        context.onDestroy(this.getAndObserve(value => {
            if (focus) {
                return;
            }
            const str = this.stringify(value);
            if (str !== input.value) {
                input.value = str;
            }
        }));
        const focusListener = () => {
            focus = true;
            this.value = this.parse(input.value);
            let mostRecentValue = input.value;
            if (interval == undefined) {
                interval = window.setInterval(() => {
                    if (input.value !== mostRecentValue) {
                        if (this.isValid(input.value)) {
                            this.value = this.parse(input.value);
                        }
                        mostRecentValue = input.value;
                    }
                }, 33);
            }
        };
        input.addEventListener('focus', focusListener);
        const clear = () => {
            focus = false;
            input.value = this.stringify(this.value);
            if (interval != undefined) {
                clearInterval(interval);
                interval = undefined;
            }
        };
        input.addEventListener('blur', clear);
        const changeListener = () => {
            const parsed = this.parse(input.value);
            if (this.value !== parsed) {
                this.value = parsed;
            }
        };
        input.addEventListener('change', changeListener);
        context.onDestroy(() => {
            input.removeEventListener('focus', focusListener);
            input.removeEventListener('blur', clear);
            input.removeEventListener('change', changeListener);
            clear();
        });
        context.onDestroy(this.disabled.getAndObserve(disabled => input.disabled = disabled));
        context.onDestroy(() => this.inputs.splice(this.inputs.indexOf(input), 1));
    }

    focus() {
        this.inputs.length && this.inputs[0].focus();
    }

    blur() {
        this.inputs.length && this.inputs[0].focus();
    }
}

export class TextControl extends TextInputControl<string> {
    constructor(
        value: string|ValueProperty<string>,
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

export class IntControl extends TextInputControl<number> {
    min = Number.MIN_SAFE_INTEGER;
    max = Number.MAX_SAFE_INTEGER;

    constructor(
        value: number|ValueProperty<number>,
        id?: string,
    ) {
        super(value, id);
    }

    isValid(str: string): boolean {
        return !!str.match(/[0-9]+/);
    }

    stringify(value: number): string {
        return String(value);
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

    add(element: Node, context: Context) {
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
        this.inputs.length && this.inputs[0].focus();
    }
}

export class RadioGroup<T extends string|number|symbol> extends SettableValueProperty<T> {
    readonly disabled = bind(false);
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

export function Field(props: {
    children: JSX.Element|JSX.Element[],
    value: ValueProperty<string>|string,
} | {
    children: JSX.Element|JSX.Element[],
    control: Control<any>,
}): JSX.Element {
    return context => {
        const children = apply(props.children, context);
        const control = 'control' in props ? props.control : new TextControl(props.value);
        children.forEach(child => {
            control.add(child, context);
            if (child instanceof HTMLElement) {
                const nested = child.querySelectorAll('*');
                for (let i = 0; i < nested.length; i++) {
                    control.add(nested[i], context);
                }
            }
        });
        return children;
    };
}
