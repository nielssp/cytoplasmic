import { Component } from "./component";
import { Property, DomEmitter, Emitter } from "./emitter";

export class Menu extends Component<HTMLUListElement> {
    readonly label = new Property('');
    items: Item[] = [];

    constructor() {
        super(document.createElement('ul'));
        this.elem.setAttribute('role', 'menu');
    }

    append<C extends HTMLElement>(child: Component<C>): void {
        if (child instanceof Menu) {
            const item = new Item();
            item.elem.setAttribute('aria-haspopup', 'true');
            child.label.bind(item.label);
            item.append(child);
            this.appendHtml(item.elem);
            this.children.push(child);
            this.items.push(item);
        } else {
            super.append(child);
        }
    }
}

export interface HotkeyEmitter {
    observe(observer: (ev: KeyboardEvent) => boolean): () => void;
}

export const documentHotkeyEmitter: HotkeyEmitter = {
    observe: observer => {
        const listener = (ev: KeyboardEvent) => {
            if (observer(ev)) {
                ev.stopPropagation();
                ev.preventDefault();
            }
        };
        document.addEventListener('keydown', listener);
        return () => document.removeEventListener('keydown', listener);
    },
}

export class MenuBar extends Menu {
    private _hotkeyEmitter?: HotkeyEmitter;

    constructor() {
        super();
        this.classList.add('menu-bar');
        this.elem.setAttribute('role', 'menubar');
    }

    get menu(): Menu {
        return this;
    }

    set menu(menu: Menu) {
        this.clear();
        for (let item of menu.children) {
            this.append(item);
        }
    }

    get hotkeyEmitter(): HotkeyEmitter|undefined {
        return this._hotkeyEmitter;
    }

    set hotkeyEmitter(hotkeyEmitter: HotkeyEmitter|undefined) {
        this._hotkeyEmitter = hotkeyEmitter;
        const action = () => {
            const unobserve = this._hotkeyEmitter?.observe(e => this.handleHotkey(e));
            if (unobserve) {
                this.destroyActions.push(unobserve);
            }
        };
        if (this.initialized) {
            action();
        } else {
            this.initActions.push(action);
        }
    }

    handleHotkey(e: KeyboardEvent): boolean {
        if (e.altKey) {
            for (let item of this.items) {
                if (item.mnemonic.value === e.key) {
                    item.elem.focus();
                    return true;
                }
            }
        }
        return false;
    }
}

export interface Action {
    activate(): void;
    hotkey: string|null;
    enabled: Property<boolean>;
}

export class Item extends Component<HTMLLIElement> {
    readonly label = new Property('');
    readonly mnemonic = new Property('');
    readonly disabled = new Property(false, disabled => this.elem.setAttribute('aria-disabled', '' + disabled));
    readonly activate = new Emitter<void>();
    private labelNode = document.createElement('span');

    constructor() {
        super(document.createElement('li'));
        this.elem.setAttribute('role', 'menuitem');
        this.elem.setAttribute('aria-haspopup', 'false');
        this.elem.setAttribute('tabindex', '0');
        this.appendHtml(this.labelNode);
        this.label.getAndObserve(value => {
            const m = value.match(/&(\w)/);
            if (m && typeof m.index === 'number') {
                this.mnemonic.value = m[1].toLowerCase();
                this.labelNode.innerHTML = '';
                this.labelNode.appendChild(document.createTextNode(value.substring(0, m.index)));
                const u = document.createElement('u');
                u.textContent = m[1];
                this.labelNode.appendChild(u);
                this.labelNode.appendChild(document.createTextNode(value.substring(m.index + 2)));
            } else {
                this.labelNode.textContent = value.replace('&', '');
            }
        });
        this.elem.addEventListener('click', () => this.activate.emit());
        this.elem.addEventListener('keydown', e => {
            if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key === 'Enter') {
                this.activate.emit();
            }
        });
    }
}

export class Separator extends Component<HTMLLIElement> {
    constructor() {
        super(document.createElement('li'));
        this.elem.setAttribute('role', 'separator');
    }
}
