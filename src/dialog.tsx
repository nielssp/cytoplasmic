import { Panel, StackColumn, Label, elem, StackRow, Button } from "./component";
import { Property } from "./emitter";

let dragTarget: Dialog|null = null;
let dragX = 0;
let dragY = 0;

document.addEventListener('mousemove', e => {
    if (dragTarget) {
        let dx = e.clientX - dragX;
        let dy = e.clientY - dragY;
        dragTarget.move(dx, dy, e);
        dragX = e.clientX;
        dragY = e.clientY;
    }
});

document.addEventListener('mouseup', () => {
    if (dragTarget) {
        dragTarget.reposition();
        dragTarget = null;
    }
});

export class Dialog extends Panel {
    private isOpen = false;
    private overlay: HTMLDivElement|null = null;
    private previousFocus: HTMLElement|null = null;
    private titleBar: Panel = new Panel('title-bar');
    private titleBarText: Panel = new Panel('title-bar-text');
    private spinner: Panel = new Panel('spinner');
    private x = new Property(0, x => this.style.left = `${x}px`);
    private y = new Property(0, y => this.style.top = `${y}px`);
    readonly busy = new Property(false, busy => this.spinner.visible = busy);
    modal = false;
    constructor() {
        super('dialog');
        this.style.position = 'fixed';
        this.style.top = '0';
        this.style.left = '0';
        this.titleBar.append(this.titleBarText);
        this.titleBar.append(this.spinner);
        this.spinner.visible = false;
        this.append(this.titleBar);
        this.titleBar.visible = false;
        this.titleBarText.elem.addEventListener('mousedown', e => {
            e.preventDefault();
            dragTarget = this;
            dragX = e.clientX;
            dragY = e.clientY;
        });
    }

    get title(): string|null {
        if (!this.titleBar.visible) {
            return null;
        }
        return this.titleBarText.textContent;
    }

    set title(title: string|null) {
        if (title) {
            this.titleBar.visible = true;
            this.titleBarText.textContent = title;
        } else  {
            this.titleBar.visible = false;
        }
    }

    move(dx: number, dy: number, e: MouseEvent) {
        this.x.value += dx;
        this.y.value += dy;
    }

    reposition() {
        const rect = this.elem.getBoundingClientRect();
        if (this.y.value < 0) {
            this.y.value = 0;
        } else if (this.y.value + 50 > document.body.clientHeight) {
            this.y.value = document.body.clientHeight - 50; 
        }
        if (this.x.value + rect.width < 50) {
            this.x.value = 50 - rect.width;
        } else if (this.x.value + 50 > document.body.clientWidth) {
            this.x.value = document.body.clientWidth - 50;
        }
    }

    trapFocus() {
        this.previousFocus = document.activeElement as HTMLElement|null;
        const tabbable = this.elem.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = tabbable.length ? tabbable[0] as HTMLElement : null;
        const last = tabbable.length ? tabbable[tabbable.length - 1] as HTMLElement : null;
        this.elem.addEventListener('keydown', e => {
            if (e.key !== 'Tab') {
                return;
            }
            if (e.shiftKey) {
                if (document.activeElement === first && last) {
                    last.focus();
                    e.preventDefault();
                }
            } else if (document.activeElement === last && first) {
                first.focus();
                e.preventDefault();
            }
        });
        if (first) {
            first.focus();
        }
    }

    open(event?: MouseEvent) {
        if (!this.isOpen) {
            if (this.modal) {
                this.overlay = document.createElement('div');
                this.overlay.classList.add('dialog-overlay');
                document.body.appendChild(this.overlay);
                this.overlay.appendChild(this.elem);
            } else {
                document.body.appendChild(this.elem);
            }
            this.style.maxWidth = `${Math.ceil(document.body.clientWidth * 0.9)}px`;
            this.style.maxHeight = `${Math.ceil(document.body.clientHeight * 0.9)}px`;
            this.isOpen = true;
            this.init();
            const rect = this.elem.getBoundingClientRect();
            if (event) {
                if (event.clientX * 2 < document.body.clientWidth) {
                    this.x.value = event.clientX + 20;
                } else {
                    this.x.value = event.clientX - rect.width - 20;
                }
                if (event.clientY * 2 < document.body.clientHeight) {
                    this.y.value = event.clientY + 20;
                } else {
                    this.y.value = event.clientY - rect.height - 20;
                }
            } else {
                this.x.value = (document.body.clientWidth - rect.width) / 2;
                this.y.value = (document.body.clientHeight - rect.height) / 4;
            }
            this.trapFocus();
        }
    }

    close() {
        if (this.isOpen) {
            if (this.overlay) {
                document.body.removeChild(this.overlay);
                this.overlay = null;
            } else {
                document.body.removeChild(this.elem);
            }
            this.isOpen = false;
            this.dispose();
            if (this.previousFocus) {
                this.previousFocus.focus();
            }
        }
    }
}

export function alert(text: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const dialog = new Dialog();
        dialog.modal = true;
        const button = new Button('OK');
        button.click.observe(() => {
            dialog.close();
            resolve();
        });
        dialog.append(<StackColumn spacing>
            <Label>{text}</Label>
            <StackRow justifyContent='flex-end'>
                {button}
            </StackRow>
        </StackColumn>);
        dialog.open();
        button.elem.focus();
        dialog.elem.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                dialog.close();
                resolve();
            }
        });
    });
}

export interface ConfirmButton<T> {
    text: string;
    role: T;
    default?: boolean;
    dismiss?: boolean;
}

export const defaultConfirmButtons: ConfirmButton<boolean>[] = [
    {
        text: 'Cancel',
        role: false,
        dismiss: true,
    },
    {
        text: 'OK',
        role: true,
        default: true
    },
];

export function confirm(text: string): Promise<boolean>;
export function confirm<T>(text: string, buttons: ConfirmButton<T>[]): Promise<T>;
export function confirm(text: string, buttons: ConfirmButton<any>[] = defaultConfirmButtons): Promise<any> {
    return new Promise(resolve => {
        const dialog = new Dialog();
        dialog.modal = true;
        let defaultButton: Button|null = null;
        let dismissRole: any = null;
        const buttonComponents = buttons.map(button => {
            const component = new Button(button.text);
            if (button.default) {
                defaultButton = component;
            }
            if (button.dismiss) {
                dismissRole = button.role;
            }
            component.click.observe(() => {
                dialog.close();
                resolve(button.role);
            });
            return component;
        });
        dialog.append(<StackColumn spacing>
            <Label>{text}</Label>
            <StackRow justifyContent='flex-end' spacing>
                {buttonComponents}
            </StackRow>
        </StackColumn>);
        dialog.open();
        if (defaultButton) {
            (defaultButton as Button).elem.focus();
        }
        dialog.elem.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (dismissRole !== null) {
                    dialog.close();
                    resolve(dismissRole);
                }
            }
        });
    });
}
