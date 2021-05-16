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

export class TextControl extends Property<string> {
    private inputs: HTMLElement[] = [];
    readonly disabled = new Property(false);
    constructor(
        value: string,
        public readonly id: string = createId('control'),
    ) {
        super(value);
    }

    add(element: HTMLElement) {
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
        this.inputs.push(input);
        input.id = this.id;
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

export function Field(props: {
    children: JSX.Element|JSX.Element[],
    value: Property<string>|string,
} | {
    children: JSX.Element|JSX.Element[],
    control: TextControl,
}) {
    const children = flatten(props.children);
    const control = 'control' in props ? props.control : new TextControl('');
    if ('value' in props) {
        bind('', props.value).bind(control);
    }
    children.forEach(child => control.add(child));
    return children;
}
