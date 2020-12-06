import { Component } from "./component";
import { Property } from "./emitter";

export class Menu extends Component<HTMLUListElement> {
    readonly title = new Property('');

    constructor() {
        super(document.createElement('ul'));
        this.elem.setAttribute('role', 'menu');
    }

    append<C extends HTMLElement>(child: Component<C>): void {
        if (child instanceof Menu) {
            const item = new Item();
            item.elem.setAttribute('role', 'menu');
            const text = document.createTextNode('' + child.title.value);
            child.title.observe(value => {
                text.textContent = '' + value;
            });
            item.elem.appendChild(text);
            item.append(child);
            super.append(item);
        } else {
            super.append(child);
        }
    }
}

export class MenuBar extends Menu {
    constructor() {
        super();
        this.classList.add('menu-bar');
    }
}

export class Item extends Component<HTMLLIElement> {
    constructor() {
        super(document.createElement('li'));
        this.elem.setAttribute('role', 'button');
        this.elem.setAttribute('tabindex', '0');
    }
}

export class Separator extends Component<HTMLLIElement> {
    constructor() {
        super(document.createElement('li'));
        this.elem.setAttribute('role', 'separator');
    }
}
