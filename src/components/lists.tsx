import { Panel, StackRow, StackColumn } from "../component";
import { DomEmitter, Observer } from "../emitter";

export class List<T> extends Panel {
    private items: Record<string, Item<T>> = {};

    constructor() {
        super('list');
    }

    update(
        items: T[],
        primaryKey: (item: T) => string|number,
        itemConstructor: (item: T) => Item<T>,
    ) {
        const keys: (string|number)[] = [];
        for (let item of items) {
            const key = '' + primaryKey(item);
            keys.push(key);
            if (this.items.hasOwnProperty(key)) {
                this.items[key].update(item);
            } else {
                this.items[key] = itemConstructor(item);
                this.append(this.items[key]);
            }
        }
        for (let key in this.items) {
            if (this.items.hasOwnProperty(key) && keys.indexOf(key) < 0) {
                this.remove(this.items[key]);
                delete this.items[key];
            }
        }
    }
}

export class Item<T> extends Panel {
    click = new DomEmitter(this.elem, 'click');
    onClick: Observer<MouseEvent>|null = null;

    constructor() {
        super('item');
    }

    init() {
        super.init();
        if (this.onClick) {
            this.elem.tabIndex = 0;
            this.elem.setAttribute('role', 'button');
            this.click.observe(this.onClick);
            this.elem.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    this.elem.click();
                }
            });
        }
    }

    update(data: T) { }

    get interactive(): boolean {
        return this.classList.contains('interactive');
    }

    set interactive(interactive: boolean) {
        if (interactive) {
            this.classList.add('interactive');
        } else {
            this.classList.remove('interactive');
        }
    }
}
