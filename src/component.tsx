import { Emitter, DomEmitter, Observer, Property, PropertyValue, EmitterObserver } from "./emitter";

export type Side = 'top' | 'right' | 'bottom' | 'left' | 'horizontal' | 'vertical';

let nextId = 0;

export function createId(): string {
    let id;
    do {
        id = 'cstkid-' + nextId;
        nextId++;
    } while (document.getElementById(id));
    return id;
}

export type ComponentProps<C> = {
    [K in keyof C]?: C[K]|Property<C[K]>|PropertyValue<C[K]>|EmitterObserver<C[K]>;
};

type ElemChild = Component<HTMLElement>|string|number|Property<string|number>|ElemChild[];

function appendChildren(comp: Component<HTMLElement>, children: ElemChild[]): void {
    children.forEach(child => {
        if (typeof child === 'string') {
            comp.elem.appendChild(document.createTextNode(child));
        } else if (typeof child === 'number') {
            comp.elem.appendChild(document.createTextNode('' + child));
        } else if (Array.isArray(child)) {
            appendChildren(comp, child);
        } else if (child instanceof Property) {
            const text = document.createTextNode('' + child.value);
            child.observe(value => {
                text.textContent = '' + value;
            });
            comp.elem.appendChild(text);
        } else {
            comp.append(child);
        }
    });
}

function assignComponentProperties<T extends Component<HTMLElement>>(comp: T, props: ComponentProps<T>): void {
    for (let prop in props) {
        if (props[prop] instanceof Property) {
            if (comp[prop] instanceof Property) {
                (props[prop] as any).bind(comp[prop]);
            } else {
                (props[prop] as any).getAndObserve((value: any) => {
                    comp[prop] = value;
                });
            }
        } else if (comp[prop] instanceof Property) {
            (comp[prop] as any).value = props[prop];
        } else if (comp[prop] instanceof Emitter) {
            (comp[prop] as any).observe(props[prop]);
        } else {
            comp[prop] = props[prop] as any;
        }
    }
}

export function elem(name: string, properties: Record<string, string>, ... children: ElemChild[]): Component<HTMLElement>;
export function elem<T extends HTMLElement, C extends Component<T>>(name: new () => C, properties: ComponentProps<C>, ... children: ElemChild[]): C;
export function elem<C extends Component<HTMLElement>>(name: string|(new () => C), properties: Record<string, string>|ComponentProps<C>, ... children: ElemChild[]): Component<HTMLElement> {
    if (typeof name === 'string') {
        const e = document.createElement(name);
        if (properties) {
            for (let prop in properties) {
                if (properties.hasOwnProperty(prop)) {
                    e.setAttribute(prop, (properties as Record<string, string>)[prop]);
                }
            }
        }
        const comp = new Component(e);
        appendChildren(comp, children);
        return comp;
    } else {
        const comp = new name();
        assignComponentProperties(comp, properties as ComponentProps<C>);
        appendChildren(comp, children);
        return comp;
    }
}

export interface Signal {
}

export class ResizeSignal implements Signal {
    constructor(public event: UIEvent) {
    }
}

export class Component<T extends HTMLElement> {
    private __bogusProps: ComponentProps<this> = {};
    readonly class = new Property<string[]|Record<string, boolean>>([], classes => {
        if (Array.isArray(classes)) {
            classes.forEach(className => this.classList.add(className));
        } else {
            for (let className in classes) {
                if (classes[className]) {
                    this.classList.add(className);
                } else {
                    this.classList.remove(className);
                }
            }
        }
    });
    children: Component<HTMLElement>[] = [];
    initialized: boolean = false;

    constructor(public elem: T) {
    }

    domProperty<TProp extends keyof T>(prop: TProp): Property<T[TProp]> {
        return new Property(this.elem[prop], value => this.elem[prop] = value);
    }

    get id(): string {
        if (!this.elem.id) {
            this.elem.id = createId();
        }
        return this.elem.id;
    }

    set id(id: string) {
        this.elem.id = id;
    }
    
    init() {
        if (this.initialized) {
            return;
        }
        this.children.forEach(c => c.init());
        this.initialized = true;
    }

    dispose() {
        this.children.forEach(c => c.dispose());
    }

    receiveSignal(signal: Signal) {
        this.children.forEach(c => c.receiveSignal(signal));
    }

    append<C extends HTMLElement>(child: Component<C>|C): Component<C> {
        if (!(child instanceof Component)) {
            let component = new Component(child);
            component.elem = child;
            child = component;
        }
        this.elem.appendChild(child.elem);
        this.children.push(child as any);
        if (this.initialized) {
            child.init();
        }
        return child;
    }

    remove<C extends HTMLElement>(child: Component<C>|HTMLElement) {
        let index;
        if (child instanceof Component) {
            index = this.children.indexOf(child as any);
        } else {
            index = this.children.findIndex(c => c.elem === child);
        }
        if (index >= 0) {
            if (this.initialized) {
                this.children[index].dispose();
            }
            this.elem.removeChild(this.children[index].elem);
            this.children.splice(index, 1);
        }
    }

    clear() {
        this.children.forEach(c => c.dispose());
        this.children = [];
        this.elem.innerHTML = '';
    }

    get visible(): boolean {
        return this.elem.style.display !== 'none';
    }

    set visible(visible: boolean) {
        this.elem.style.display = visible ? '' : 'none';
    }

    get classList(): DOMTokenList {
        return this.elem.classList;
    }

    get style(): CSSStyleDeclaration {
        return this.elem.style;
    }

    get textContent(): string|null {
        return this.elem.textContent;
    }

    set textContent(text: string|null) {
        this.elem.textContent = text;
    }

    get alignSelf(): string {
        return this.style.alignSelf;
    }

    set alignSelf(alignSelf: string) {
        this.style.alignSelf = alignSelf;
    }

    get justifySelf(): string {
        return this.style.justifySelf;
    }

    set justifySelf(justifySelf: string) {
        this.style.justifySelf = justifySelf;
    }

    get flexGrow(): string {
        return this.style.flexGrow;
    }

    set flexGrow(flexGrow: string) {
        this.style.flexGrow = flexGrow;
    }

    get flexShrink(): string {
        return this.style.flexShrink;
    }

    set flexShrink(flexShrink: string) {
        this.style.flexShrink = flexShrink;
    }

    get flexBasis(): string {
        return this.style.flexBasis;
    }

    set flexBasis(flexBasis: string) {
        this.style.flexBasis = flexBasis;
    }

    get textAlign(): string {
        return this.style.textAlign;
    }

    set textAlign(textAlign: string) {
        this.style.textAlign = textAlign;
    }

    getAttibute(attribute: string): string|null {
        return this.elem.getAttribute(attribute);
    }

    setAttribute(attribute: string, value: string) {
        this.elem.setAttribute(attribute, value);
    }

    get padding(): Side[]|boolean {
        if (this.classList.contains('padding')) {
            return true;
        }
        return (['top', 'right', 'bottom', 'left', 'vertical', 'horizontal'] as const)
            .filter(side => this.classList.contains(`padding-${side}`));
    }

    set padding(padding: Side[]|boolean) {
        if (padding === true) {
            this.classList.add('padding');
        } else {
            ['', '-top', '-right', '-bottom', '-left', '-vertical', '-horizontal']
                .forEach(side => this.classList.remove(`padding${side}`));
            if (padding !== false) {
                padding.forEach(side => {
                    this.classList.add('padding-' + side);
                });
            }
        }
    }

    get margin(): Side[]|boolean {
        if (this.classList.contains('margin')) {
            return true;
        }
        return (['top', 'right', 'bottom', 'left', 'vertical', 'horizontal'] as const)
            .filter(side => this.classList.contains(`margin-${side}`));
    }

    set margin(margin: Side[]|boolean) {
        if (margin === true) {
            this.classList.add('margin');
        } else {
            ['', '-top', '-right', '-bottom', '-left', '-vertical', '-horizontal']
                .forEach(side => this.classList.remove(`margin${side}`));
            if (margin !== false) {
                margin.forEach(side => {
                    this.classList.add('margin-' + side);
                });
            }
        }
    }
}

export class Panel extends Component<HTMLDivElement> {
    constructor(... classList: string[]) {
        super(document.createElement('div'));
        classList.forEach(c => this.classList.add(c));
    }
}

export class Inline extends Component<HTMLSpanElement> {
    constructor(text: string = '', ... classList: string[]) {
        super(document.createElement('span'));
        classList.forEach(c => this.classList.add(c));
        this.textContent = text;
    }
}

interface StackOptions {
    alignItems?: string;
    justifyContent?: string;
}


export interface StackChildOptions {
    alignSelf?: string;
    justifySelf?: string;
    flexGrow?: string;
    flexShrink?: string;
}

export abstract class StackLayout extends Panel {
    constructor(options: StackOptions = {}, ... classList: string[]) {
        super(... classList);
        if (options.alignItems) {
            this.style.alignItems = options.alignItems;
        }
        if (options.justifyContent) {
            this.style.justifyContent = options.justifyContent;
        }
    }

    append<C extends HTMLElement>(child: Component<C>|C, options: StackChildOptions = {}): Component<C> {
        const component = super.append(child);
        if (options.alignSelf) {
            component.style.alignSelf = options.alignSelf;
        }
        if (options.justifySelf) {
            component.style.justifySelf = options.justifySelf;
        }
        if (options.flexGrow) {
            component.style.flexGrow = options.flexGrow;
        }
        if (options.flexShrink) {
            component.style.flexShrink = options.flexShrink;
        }
        return component;
    }

    get alignItems(): string {
        return this.style.alignItems;
    }

    set alignItems(alignItems: string) {
        this.style.alignItems = alignItems;
    }

    get justifyContent(): string {
        return this.style.justifyContent;
    }

    set justifyContent(justifyContent: string) {
        this.style.justifyContent = justifyContent;
    }

    get spacing(): boolean {
        return this.classList.contains('spacing');
    }

    set spacing(spacing: boolean) {
        if (spacing) {
            this.classList.add('spacing');
        } else {
            this.classList.remove('spacing');
        }
    }
}

export class StackColumn extends StackLayout {
    constructor(options: StackOptions = {}, ... classList: string[]) {
        super(options, 'stack-column', ... classList);
    }
}

export class StackRow extends StackLayout {
    private _minWidth: number = 0;

    constructor(options: StackOptions = {}, ... classList: string[]) {
        super(options, 'stack-row', ... classList);
    }

    init() {
        super.init();
        this.updateSize();
    }

    get minWidth(): number {
        return this._minWidth;
    }

    set minWidth(minWidth: number) {
        this._minWidth = minWidth;
    }

    updateSize() {
        const rect = this.elem.getBoundingClientRect();
        if (rect.width < this.minWidth) {
            this.classList.add('wrap');
        } else {
            this.classList.remove('wrap');
        }
    }

    receiveSignal(signal: Signal) {
        if (this.minWidth > 0 && signal instanceof ResizeSignal) {
            this.updateSize();
        }
    }
}

export class Form extends Component<HTMLFormElement> {
    readonly submit = new DomEmitter(this.elem, 'submit');

    constructor() {
        super(document.createElement('form'));
        this.submit.observe(e => e.preventDefault());
    }
}

export class Button extends Component<HTMLButtonElement> {
    readonly click = new DomEmitter(this.elem, 'click');

    constructor(text: string, ... classList: string[]) {
        super(document.createElement('button'));
        this.elem.textContent = text;
        classList.forEach(c => this.classList.add(c));
        this.type = 'button';
    }

    get type(): string {
        return this.elem.type;
    }

    set type(type: string) {
        this.elem.type = type;
    }

    get disabled(): boolean {
        return this.elem.disabled;
    }

    set disabled(disabled: boolean) {
        this.elem.disabled = disabled;;
    }
}

export class Radio extends Component<HTMLInputElement> {
    readonly name = this.domProperty('name');
    readonly value = this.domProperty('value');
    readonly disabled = this.domProperty('disabled');
    readonly checked = this.domProperty('checked');
    readonly change = new DomEmitter(this.elem, 'change');

    constructor() {
        super(document.createElement('input'));
        this.elem.type = 'radio';
        this.change.observe(() => {
            this.checked.value = this.elem.checked;
        });
    }

    init() {
        super.init();
        if (this.elem.form) {
            for (let element of Array.from(this.elem.form.elements)) {
                if (element instanceof HTMLInputElement && element.type === 'radio') {
                    element.addEventListener('change', () => {
                        this.checked.value = this.elem.checked;
                    });
                }
            }
        }
    }
}

export class RadioGroup {
    constructor(public name: string) {
    }

    add(value: string, checked: boolean = false): Radio {
        return <Radio name={this.name} value={value} checked={checked}/>
    }
}

export class TextInput extends Component<HTMLInputElement> {
    private interval: number|null = null;
    private pendingFocus: boolean = false;
    readonly value = new Property('', value => this.elem.value = value);
    change = new Emitter<string>();

    constructor() {
        super(document.createElement('input'));
        this.elem.type = 'text';
        this.elem.addEventListener('focus', () => {
            this.value.value = this.elem.value;
            if (this.interval === null) {
                this.interval = window.setInterval(() => {
                    if (this.value.value !== this.elem.value) {
                        this.value.value = this.elem.value;
                        this.change.emit(this.elem.value);
                    }
                }, 33);
            }
        });
        this.elem.addEventListener('blur', () => {
            if (this.interval !== null) {
                clearInterval(this.interval);
                this.interval = null;
            }
        });
    }

    init() {
        super.init();
    }

    get disabled(): boolean {
        return this.elem.disabled;
    }

    set disabled(disabled: boolean) {
        this.elem.disabled = disabled;;
        if (this.pendingFocus) {
            this.elem.focus();
            this.pendingFocus = false;
        }
    }

    get focus(): boolean {
        return document.activeElement === this.elem;
    }

    set focus(focus: boolean) {
        if (focus) {
            if (this.disabled) {
                this.pendingFocus = true;
            } else {
                this.elem.focus();
            }
        } else {
            this.elem.blur();
            this.pendingFocus = false;
        }
    }
}

export class NumberInput extends Component<HTMLInputElement> {
    private interval: number|null = null;
    readonly value = new Property(0, value => this.elem.value = '' + value);
    readonly disabled = new Property(false, disabled => this.elem.disabled = disabled);

    constructor() {
        super(document.createElement('input'));
        this.elem.type = 'number';
        this.elem.addEventListener('focus', () => {
            this.value.value = parseFloat(this.elem.value);
            if (this.interval === null) {
                this.interval = window.setInterval(() => {
                    const value = parseFloat(this.elem.value);
                    if (this.value.value !== value) {
                        this.value.value = value;
                    }
                }, 33);
            }
        });
        this.elem.addEventListener('blur', () => {
            if (this.interval !== null) {
                clearInterval(this.interval);
                this.interval = null;
            }
        });
    }
}

export interface Option<T> {
    value: T;
    label: string|Property<string>;
}

export class Select<T> extends Component<HTMLSelectElement> {
    private optionMap: Record<string, T> = {};
    readonly disabled = this.domProperty('disabled');
    readonly value = new Property<T|null>(null, value => this.setValue(value));

    constructor() {
        super(document.createElement('select'));
        this.elem.size = 1;
        this.elem.addEventListener('change', () => {
            this.value.value = this.optionMap[this.elem.value];
        });
    }

    private setValue(value: T|null) {
    }

    get size(): number {
        return this.elem.size;
    }

    set size(size: number) {
        this.elem.size = size;
    }

    get multiple(): boolean {
        return this.elem.multiple;
    }

    set multiple(multiple: boolean) {
        this.elem.multiple = multiple;
    }

    get options(): Option<T>[] {
        const options: Option<T>[] = [];
        for (let option of Array.from(this.elem.options)) {
            options.push({
                value: this.optionMap[option.value],
                label: option.label
            });
        }
        return options;
    }

    set options(options: Option<T>[]) {
        this.clear();
        this.optionMap = {};
        let nextValue = 0;
        for (let option of options) {
            const optionElem = document.createElement('option');
            optionElem.value = '' + nextValue;
            this.optionMap[optionElem.value] = option.value;
            if (option.label instanceof Property) {
                optionElem.label = option.label.value;
                option.label.observe(value => {
                    optionElem.label = value;
                });
            } else {
                optionElem.label = option.label;
            }
            this.elem.appendChild(optionElem);
            nextValue++;
        }
        this.value.value = this.optionMap[this.elem.value];
    }

    get selection(): T[] {
        const selection: T[] = [];
        for (let option of Array.from(this.elem.selectedOptions)) {
            selection.push(this.optionMap[option.value]);
        }
        return selection;
    }

    set selection(selection: T[]) {
        for (let option of Array.from(this.elem.selectedOptions)) {
            if (selection.indexOf(this.optionMap[option.value]) >= 0) {
                option.selected = true;
            }
        }
    }
}

export class Label extends Panel {
    constructor(text: string = '', ... classList: string[]) {
        super(... classList);
        this.elem.textContent = text;
    }

    get emphasis(): string|null {
        if (this.classList.contains('stronger')) {
            return 'stronger';
        } else if (this.classList.contains('strong')) {
            return 'strong';
        } else if (this.classList.contains('weak')) {
            return 'weak';
        } else if (this.classList.contains('weaker')) {
            return 'weaker';
        }
        return null;
    }

    set emphasis(emphasis: string|null) {
        ['stronger', 'strong', 'weak', 'weaker'].forEach(em => this.classList.remove(em));
        if (emphasis) {
            this.classList.add(emphasis);
        }
    }
}

export class InputLabel extends Component<HTMLLabelElement> {
    private _input: Component<any>|null = null;

    constructor() {
        super(document.createElement('label'));
    }

    get input(): Component<any>|null {
        return this._input;
    }

    set input(input: Component<any>|null) {
        this._input = input;
        if (input) {
            this.elem.htmlFor = input.id;
        } else {
            this.elem.htmlFor = '';
        }
    }

    get inputId(): string {
        return this.elem.htmlFor;
    }

    set inputId(id: string) {
        this.elem.htmlFor = id;
    }
}

export class Style extends Component<HTMLElement> {
    private target: HTMLElement|null = null;
    readonly name = new Property<keyof CSSStyleDeclaration|null>(null, () => this.update());
    readonly value = new Property<string>('', () => this.update());
    constructor() {
        super(document.createElement('span'));
        this.visible = false;
    }

    init() {
        super.init();
        if (this.elem.parentElement) {
            this.target = this.elem.parentElement;
            this.target.removeChild(this.elem);
            this.update();
        }
    }

    update() {
        if (this.target && this.name.value) {
            this.target.style[this.name.value as any] = this.value.value;
        }
    }
}

export class ModalLoader extends Component<HTMLDivElement> {
    private target: HTMLElement|null = null;
    private previousFocus: HTMLElement|null = null;

    constructor() {
        super(document.createElement('div'));
        this.classList.add('modal-loader');
        this.visible = false;
    }

    init() {
        super.init();
        if (this.elem.parentElement) {
            this.target = this.elem.parentElement;
            this.target.style.position = 'relative';
        }
    }

    set visible(visible: boolean) {
        this.elem.style.display = visible ? '' : 'none';
        if (!this.target) {
            return;
        }
        if (visible) {
            this.previousFocus = document.activeElement as HTMLElement|null;
            if (this.previousFocus) {
                this.previousFocus.blur();
            }
            this.target.style.opacity = '0.5';
        } else {
            this.target.style.opacity = '';
            if (this.previousFocus) {
                this.previousFocus.focus();
                this.previousFocus = null;
            }
        }
    }
}
