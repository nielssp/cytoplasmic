import { Property, bind, ValueProperty, apply } from "./component";

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
    readonly disabled = bind(false);
    constructor(
        value: T,
        public readonly id: string = createId('control'),
    ) {
        super(value);
    }

    abstract add(element: Node, context: JSX.Context): void;
}

export class CheckboxControl extends Control<boolean> {
    private inputs: HTMLElement[] = [];
    constructor(
        value: boolean,
        id?: string,
    ) {
        super(value, id);
    }

    add(element: Node, context: JSX.Context) {
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

    protected addCheckboxInput(input: HTMLInputElement, context: JSX.Context) {
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

export class TextControl extends Control<string> {
    private inputs: (HTMLInputElement|HTMLTextAreaElement)[] = [];
    constructor(
        value: string,
        id?: string,
    ) {
        super(value, id);
    }

    set(value: string) {
        this.inputs.forEach(input => {
            if (value !== input.value) {
                input.value = value;
            }
        });
        super.set(value);
    }

    add(element: Node, context: JSX.Context) {
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

    private addTextInput(input: HTMLInputElement|HTMLTextAreaElement, context: JSX.Context) {
        if (!this.inputs.length) {
            input.id = this.id;
        }
        this.inputs.push(input);
        let interval: number|undefined;
        input.value = this.value;
        const focusListener = () => {
            this.value = input.value;
            if (interval == undefined) {
                interval = window.setInterval(() => {
                    if (this.value !== input.value) {
                        this.value = input.value;
                    }
                }, 33);
            }
        };
        input.addEventListener('focus', focusListener);
        const clear = () => {
            if (interval != undefined) {
                clearInterval(interval);
                interval = undefined;
            }
        };
        input.addEventListener('blur', clear);
        context.onDestroy(() => {
            input.removeEventListener('focus', focusListener);
            input.removeEventListener('blur', clear);
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

    add(element: Node, context: JSX.Context) {
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

    protected addRadioInput(input: HTMLInputElement, context: JSX.Context) {
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

export class RadioGroup<T extends string|number|symbol> extends ValueProperty<T> {
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
    value: Property<string>|string,
} | {
    children: JSX.Element|JSX.Element[],
    control: Control<any>,
}): JSX.Element {
    return context => {
        const children = apply(props.children, context);
        const control = 'control' in props ? props.control : new TextControl('');
        if ('value' in props) {
            // TODO: bind('', props.value).bind(control);
        }
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
