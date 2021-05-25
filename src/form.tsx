import { Property, flatten, bind } from "./component";

let nextId = 0;

export function createId(prefix: string): string {
    let id;
    do {
        id = `${prefix}${nextId}`;
        nextId++;
    } while (document.getElementById(id));
    return id;
}

export abstract class Control<T> extends Property<T> {
    readonly disabled = new Property(false);
    constructor(
        value: T,
        public readonly id: string = createId('control'),
    ) {
        super(value);
    }

    abstract add(element: Element): void;
}

export class CheckboxControl extends Control<boolean> {
    private inputs: HTMLElement[] = [];
    constructor(
        value: boolean,
        id?: string,
    ) {
        super(value, id);
    }

    add(element: Element) {
        switch (element.tagName) {
            case 'LABEL':
                (element as HTMLLabelElement).htmlFor = this.id;
                break;
            case 'INPUT':
                this.addCheckboxInput(element as HTMLInputElement);
                break;
        }
    }

    protected addCheckboxInput(input: HTMLInputElement) {
        if (!this.inputs.length) {
            input.id = this.id;
        }
        this.inputs.push(input);
        this.getAndObserve(v => input.checked = v);
        input.addEventListener('change', () => {
            this.value = input.checked;
        });
        this.disabled.getAndObserve(disabled => input.disabled = disabled);
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

    protected addCheckboxInput(input: HTMLInputElement) {
        super.addCheckboxInput(input);
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

    add(element: Element) {
        switch (element.tagName) {
            case 'LABEL':
                (element as HTMLLabelElement).htmlFor = this.id;
                break;
            case 'INPUT':
                this.addTextInput(element as HTMLInputElement);
                break;
            case 'TEXTAREA':
                this.addTextInput(element as HTMLTextAreaElement);
                break;
        }
    }

    private addTextInput(input: HTMLInputElement|HTMLTextAreaElement) {
        if (!this.inputs.length) {
            input.id = this.id;
        }
        this.inputs.push(input);
        this.getAndObserve(v => input.value = v);
        let interval: number|undefined;
        input.addEventListener('focus', () => {
            this.value = input.value;
            if (interval == undefined) {
                interval = window.setInterval(() => {
                    if (this.value !== input.value) {
                        this.value = input.value;
                    }
                }, 33);
            }
        });
        input.addEventListener('blur', () => {
            if (interval != undefined) {
                clearInterval(interval);
                interval = undefined;
            }
        });
        this.disabled.getAndObserve(disabled => input.disabled = disabled);
    }

    focus() {
        this.inputs.length && this.inputs[0].focus();
    }

    blur() {
        this.inputs.length && this.inputs[0].focus();
    }
}

export class RadioGroup<T extends string|number|symbol> extends Property<T> {
    readonly disabled = new Property(false);
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
}) {
    const children = flatten(props.children);
    const control = 'control' in props ? props.control : new TextControl('');
    if ('value' in props) {
        bind('', props.value).bind(control);
    }
    children.forEach(child => {
        control.add(child);
        const nested = child.querySelectorAll('*');
        for (let i = 0; i < nested.length; i++) {
            control.add(nested[i]);
        }
    });
    return children;
}
