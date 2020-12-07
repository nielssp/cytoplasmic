import { Component } from "./component";

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
    constructor(... classList: string[]) {
        super(... classList);
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
    constructor(... classList: string[]) {
        super('stack-column', ... classList);
    }
}

export class StackRow extends StackLayout {
    private _minWidth: number = 0;

    constructor(... classList: string[]) {
        super('stack-row', ... classList);
        this.observeWindow('resize', () => this.updateSize());
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
        if (!this.minWidth) {
            return;
        }
        const rect = this.elem.getBoundingClientRect();
        if (rect.width < this.minWidth) {
            this.classList.add('wrap');
        } else {
            this.classList.remove('wrap');
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
