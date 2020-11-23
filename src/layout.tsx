import { Component, Signal, ResizeSignal } from "./component";

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
