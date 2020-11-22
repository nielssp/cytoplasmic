import { Component, Panel, Button } from "../component";
import { Emitter } from "../emitter";

export class TabPage<T extends Component<any>> extends Panel {
    button = new Button(this._name);

    constructor(public container: Tabbed, public content: T, private _name: string, public readonly tag: string|null = null) {
        super();
        this.button.setAttribute('role', 'tab');
        this.button.click.observe(() => this.select());
        this.append(content);
    }

    get name(): string {
        return this._name;
    }

    set name(name: string) {
        this.button.textContent = name;
        this._name = name;
    }

    get active(): boolean {
        return this.button.classList.contains('active');
    }

    set active(active: boolean) {
        if (active) {
            this.button.classList.add('active');
            this.button.setAttribute('aria-selected', 'true');
            this.button.setAttribute('tabindex', '0');
        } else {
            this.button.classList.remove('active');
            this.button.setAttribute('aria-selected', 'false');
            this.button.setAttribute('tabindex', '-1');
        }
        this.visible = active;
    }

    select() {
        this.container.pages.forEach(page => page.active = false);
        this.active = true;
        this.container.activePage = this;
        this.button.elem.focus();
        this.container.pageSelected.emit(this);
    }

    close() {
        const i = this.container.pages.indexOf(this);
        if (i >= 0) {
            this.container.pages.splice(i, 1);
        }
        this.container.tabList.remove(this.button);
        this.container.pageContainer.remove(this);
        if (this.container.activePage === this) {
            this.container.activePage = null;
            if (i > 0) {
                this.container.pages[i - 1].select();
            } else if (this.container.pages.length) {
                this.container.pages[0].select();
            }
        }
    }
}

export class Tabbed extends Panel {
    tabBar = new Panel('tabbed-tab-bar');
    tabList = new Panel('tabbed-tab-list');
    pageContainer = new Panel('tabbed-page');
    pages: TabPage<any>[] = [];
    activePage: TabPage<any>|null = null;
    readonly pageSelected = new Emitter<TabPage<any>>();

    constructor() {
        super('tabbed-container');
        this.tabList.setAttribute('role', 'tablist');
        this.tabBar.append(this.tabList);
        this.tabBar.append(new Panel()); // spacer
        this.append(this.tabBar);
        this.append(this.pageContainer);

        this.tabList.elem.addEventListener('keydown', e => {
            if (this.activePage) {
                const i = this.pages.indexOf(this.activePage);
                if (i >= 0) {
                    if (e.key === 'ArrowLeft' && i > 0) {
                        this.pages[i - 1].select();
                    } else if (e.key === 'ArrowRight' && i < this.pages.length - 1) {
                        this.pages[i + 1].select();
                    }
                }
            }
        });
    }

    addPage<T extends Component<HTMLElement>>(content: T, name: string, tag: string|null = null): TabPage<T> {
        const page = new TabPage(this, content, name, tag);
        this.pageContainer.append(page);
        this.tabList.append(page.button);
        this.pages.push(page);
        if (!this.activePage) {
            page.select();
        } else {
            page.active = false;
        }
        return page;
    }

    select(tag: string) {
        const page = this.pages.find(p => p.tag === tag);
        if (page) {
            page.select();
        }
    }
}
