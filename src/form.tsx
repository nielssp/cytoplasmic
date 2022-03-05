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
    }

    focus() {
        this.inputs.length && this.inputs[0].focus();
    }

    blur() {
        this.inputs.length && this.inputs[0].focus();
    }
}

export class RadioControl extends CheckboxControl {
    constructor(
        value: boolean,
        public readonly name: string,
        id?: string,
    ) {
        super(value, id);
    }

    protected addCheckboxInput(input: HTMLInputElement, context: JSX.Context) {
        super.addCheckboxInput(input, context);
        input.name = this.name;
    }
}

export class TextControl extends Control<string> {
    private inputs: HTMLElement[] = [];
    constructor(
        value: string,
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
        context.onDestroy(this.getAndObserve(v => input.value = v));
        let interval: number|undefined;
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
    readonly radios = {} as Record<T, RadioControl>;
    constructor(
        value: T,
        public readonly name: string = createId('radiogroup'),
    ) {
        super(value);
    }

    get(value: T): RadioControl {
        if (!this.radios.hasOwnProperty(value)) {
            this.radios[value] = new RadioControl(this.value === value, this.name);
            this.radios[value].observe(checked => {
                if (checked) {
                    this.value = value;
                }
            });
            this.disabled.getAndObserve(disabled => this.radios[value].disabled.value = disabled);
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
