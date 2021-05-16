
function appendChildren(element: HTMLElement, children: JSX.ElementChild[]): void {
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (typeof child === 'number') {
            element.appendChild(document.createTextNode('' + child));
        } else if (Array.isArray(child)) {
            appendChildren(element, child);
        } else if (child instanceof Property) {
            const text = document.createTextNode('' + child.value);
            child.observe((value: string|number) => {
                text.textContent = '' + value;
            });
            element.appendChild(text);
        } else if (child instanceof Element) {
            element.appendChild(child);
        }
    });
}

type ElementAttributes = Record<string, string|number|boolean|Property<string>|Property<number>|Property<boolean>|EventListenerOrEventListenerObject>;

export function createElement(name: string, properties: ElementAttributes, ... children: JSX.ElementChild[]): HTMLElement;
export function createElement<T extends HTMLElement, TProps extends {}>(name: (props: TProps) => T, properties: TProps, ... children: JSX.ElementChild[]): T;
export function createElement<TProps extends {}>(name: string|((props: TProps) => HTMLElement), properties: TProps & ElementAttributes, ... children: JSX.ElementChild[]): HTMLElement {
    if (typeof name === 'string') {
        const e = document.createElement(name);
        if (properties) {
            for (let prop in properties) {
                if (properties.hasOwnProperty(prop)) {
                    const value = properties[prop];
                    if (prop.startsWith('on')) {
                        const finalName = prop.replace(/Capture$/, '');
                        const useCapture = prop !== finalName;
                        const eventName = finalName.toLowerCase().substring(2);
                        e.addEventListener(eventName, value as EventListenerOrEventListenerObject, useCapture);
                    } else if (value instanceof Property) {
                        value.getAndObserve((value: string|number|boolean) => {
                            if (value === true) {
                                e.setAttribute(prop, prop);
                            } else if (value || value === 0) {
                                e.setAttribute(prop, '' + value)
                            } else {
                                e.removeAttribute(prop);
                            }
                        });
                    } else if (value === true) {
                        e.setAttribute(prop, prop);
                    } else if (value || value === 0) {
                        e.setAttribute(prop, '' + value);
                    }
                }
            }
        }
        appendChildren(e, children);
        return e;
    } else {
        return name({... properties, children});
    }
}

export type PropertyValue<T> = T extends Property<infer TValue> ? TValue : never;

export type Observer<T> = (event: T) => any;

export type PropertyObserver<T> = (newValue: T, oldValue: T) => any;

export class Emitter<T> {
    private observers: Observer<T>[] = [];

    emit(event: T): void {
        for (let observer of this.observers) {
            if (observer(event) === false) {
                return;
            }
        }
    }

    observe(observer: Observer<T>): () => void {
        this.observers.push(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: Observer<T>): void {
        this.observers = this.observers.filter(o => o !== observer);
    }

    next(): Promise<T> {
        return new Promise(resolve => {
            const unobserve = this.observe(x => {
                unobserve();
                resolve(x);
            });
        });
    }
}

export class Property<T> {
    private observers: PropertyObserver<T>[] = [];
    private binding: Property<T>[] = [this];

    constructor(protected _value: T) {
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        for (let prop of this.binding) {
            const old = prop._value;
            prop._value = value;
            for (let observer of prop.observers) {
                observer(value, old);
            }
        }
    }

    bind(prop: Property<T>) {
        if (prop.binding === this.binding) {
            return;
        }
        prop.value = this.value;
        for (let boundProp of prop.binding) {
            this.binding.push(boundProp);
            boundProp.binding = this.binding;
        }
    }

    getAndObserve(observer: PropertyObserver<T>): () => void {
        observer(this._value, this._value);
        return this.observe(observer);
    }

    observe(observer: PropertyObserver<T>): () => void {
        this.observers.push(observer);
        return () => this.unobserve(observer);
    }

    unobserve(observer: PropertyObserver<T>): void {
        this.observers = this.observers.filter(o => o !== observer);
    }

    map<T2>(f: (value: T) => T2): Property<T2> {
        const prop = new Property(f(this._value));
        this.observe(value => {
            prop.value = f(value);
        });
        return prop;
    }

    flatMap<T2>(f: (value: T) => Property<T2>): Property<T2> {
        let other = f(this._value);
        const prop = new Property(other.value);
        let unobserver = other.observe(value => {
            prop.value = value;
        });
        this.observe(value => {
            unobserver();
            other = f(value);
            prop.value = other.value;
            unobserver = other.observe(value => {
                prop.value = value;
            });
        });
        return prop;
    }

    get not(): Property<boolean> {
        return this.map(x => !x);
    }

    get defined(): Property<boolean> {
        return this.map(x => x != undefined);
    }

    get undefined(): Property<boolean> {
        return this.map(x => x == undefined);
    }

    and<T2>(other: Property<T2>): Property<T2|false> {
        const prop = new Property(!!this.value && other.value);
        let unobserver = other.observe(value => {
            prop.value = value;
        });
        this.observe(value => {
            unobserver();
            prop.value = !!value && other.value;
            unobserver = other.observe(value => {
                prop.value = value;
            });
        });
        return prop;
    }

    or<T2>(other: Property<T2>): Property<T|T2> {
        const prop = new Property(this.value || other.value);
        let unobserver = other.observe(value => {
            prop.value = value;
        });
        this.observe(value => {
            unobserver();
            prop.value = value || other.value;
            unobserver = other.observe(value => {
                prop.value = value;
            });
        });
        return prop;
    }
}

export function bind<T>(defaultValue: Property<T>|T, binding?: Property<T>|T): Property<T> {
    if (typeof binding === 'undefined') {
        if (defaultValue instanceof Property) {
            return defaultValue;
        } else {
            return new Property(defaultValue);
        }
    } else if (binding instanceof Property) {
        return binding;
    } else {
        return new Property(binding);
    }
}

export class ListProperty<T> {
    private _items: Property<T>[] = [];
    readonly length = bind(0);
    readonly onInsert = new Emitter<{index: number, item: Property<T>}>();
    readonly onRemove = new Emitter<number>();

    constructor(
        initialItems: T[],
    ) {
        this._items = initialItems.map(item => bind(item));
        this.length.value = this._items.length;
    }

    get items() {
        return this._items;
    }

    push(item: T): void {
        const index = this.length.value;
        const prop = bind(item);
        this._items.push(prop);
        this.length.value++;
        this.onInsert.emit({index, item: prop});
    }

    remove(index: number): void {
        if (index >= 0 && index < this._items.length) {
            this._items.splice(index, 1);
            this.length.value--;
            this.onRemove.emit(index);
        }
    }
}

export function bindList<T>(initialItems: T[] = []): ListProperty<T> {
    return new ListProperty(initialItems);
}

export function loop<T>(
    list: ListProperty<T>|Property<T[]>,
    body: (value: Property<T>) => JSX.Element
): JSX.Element {
    const marker = document.createElement('span');
    marker.style.display = 'none';
    let elements: HTMLElement[] = [marker];
    if (list instanceof ListProperty) {
        list.items.forEach(item => {
            flatten(body(item)).forEach(element => elements.splice(-1, 0, element));
        });
        list.onInsert.observe(({index, item}) => {
            // TODO: index
            const element = flatten(body(item));
            if (marker.parentElement) {
                for (let e of element) {
                    marker.parentElement.insertBefore(e, marker);
                }
            }
            element.forEach(element => elements.splice(-1, 0, element));
        });
        list.onRemove.observe(index => {
            if (marker.parentElement) {
                const markerIndex = Array.prototype.indexOf.call(marker.parentElement.children, marker);
                console.log(markerIndex, index);
                if (markerIndex >= index) {
                    const elementIndex = markerIndex - (list.length.value + 1 - index);
                    marker.parentElement.removeChild(marker.parentElement.children[elementIndex]);
                }
            }
            elements.splice(index + 1, 0);
        });
    } else {
        // TODO
    }
    return elements;
}

export function flatten(elements: JSX.Element[]|JSX.Element): HTMLElement[] {
    const result = [];
    if (Array.isArray(elements)) {
        elements.forEach(element => {
            if (Array.isArray(element)) {
                element.forEach(e => result.push(e));
            } else {
                result.push(element);
            }
        });
    } else {
        result.push(elements);
    }
    return result;
}

export function map<T>(property: Property<T>, f: ((value: T) => JSX.Element[]|JSX.Element)): JSX.Element {
    const marker = document.createElement('span');
    marker.style.display = 'none';
    let elements: HTMLElement[] = [marker];
    property.getAndObserve(value => {
        for (let i = 1; i < elements.length; i++) {
            const element = elements[i];
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        }
        elements.splice(1, elements.length);
        flatten(f(value)).forEach(element => {
            if (marker.parentElement) {
                marker.parentElement.insertBefore(element, marker);
            }
            elements.push(element);
        });
    });
    return elements;
}

export function ifDefined<T>(property: Property<T|undefined>, f: ((value: T) => JSX.Element)) {
    const marker = document.createElement('span');
    marker.style.display = 'none';
    let elements: HTMLElement[] = [marker];
    property.getAndObserve(value => {
        for (let i = 1; i < elements.length; i++) {
            const element = elements[i];
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        }
        elements.splice(1, elements.length);
        if (value != undefined) {
            flatten(f(value)).forEach(element => {
                if (marker.parentElement) {
                    marker.parentElement.insertBefore(element, marker);
                }
                elements.push(element);
            });
        }
    });
    return elements;
}

export function Hide(props: {
    children: JSX.Element[]|JSX.Element
    when: Property<any>,
} | {
    children: JSX.Element[]|JSX.Element
    unless: Property<any>,
}) {
    const children = flatten(props.children);
    if ('when' in props) {
        props.when.getAndObserve(condition => {
            const display = condition ? 'none' : '';
            children.forEach(child => child.style.display = display);
        });
    } else {
        props.unless.getAndObserve(condition => {
            const display = condition ? '' : 'none';
            children.forEach(child => child.style.display = display);
        });
    }
    return children;
}

export function Style(props: {
    children: JSX.Element[]|JSX.Element
} & {
    [TKey in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[TKey]|Property<CSSStyleDeclaration[TKey]>
}) {
    const children = flatten(props.children);
    (Array.isArray(children) ? children : [children]).forEach(child => {
        for (let key in props) {
            if (props.hasOwnProperty(key) && key !== 'children') {
                const value = props[key];
                if (value instanceof Property) {
                    value.getAndObserve(v => child.style[key] = v);
                } else if (value) {
                    child.style[key] = value;
                }
            }
        }
    });
    return children;
}

export function Class(props: {
    children: JSX.Element[]|JSX.Element
    name: Property<string|undefined>|string|undefined,
    enable?: Property<boolean>|boolean,
}) {
    const children = flatten(props.children);
    const name = bind(undefined, props.name);
    const enable = bind(true, props.enable);
    let currentClass: string|undefined;
    enable.flatMap(enable => name.map(n => enable ? n : undefined)).getAndObserve(n => {
        if (currentClass) {
            for (const child of children) {
                child.classList.remove(currentClass);
            }
        }
        currentClass = n;
        if (currentClass) {
            for (const child of children) {
                child.classList.add(currentClass);
            }
        }
    });
    return children;
}

export function handle<TEvent>(f?: (ev: TEvent) => void): (ev: TEvent) => void {
    return f || (() => {});
}

export function mount(container: HTMLElement, ... elements: JSX.Element[]) {
    flatten(elements).forEach(e => container.appendChild(e));
}

export function Fragment({children}: {children: JSX.Element[]|JSX.Element}) {
    return flatten(children);
}

declare global {
    namespace JSX {
        type Element = HTMLElement|HTMLElement[];

        interface ElementAttributesProperty {
            props: any;
        }
        interface ElementChildrenAttribute {
            children: any;
        }

        type ElementChild = HTMLElement|string|number|Property<string>|Property<number>|ElementChild[];

        type EventHandler<TEvent extends Event> = (this: HTMLElement, ev: TEvent) => void;

        type ClipboardEventHandler = EventHandler<ClipboardEvent>;
        type CompositionEventHandler = EventHandler<CompositionEvent>;
        type DragEventHandler = EventHandler<DragEvent>;
        type FocusEventHandler = EventHandler<FocusEvent>;
        type KeyboardEventHandler = EventHandler<KeyboardEvent>;
        type MouseEventHandler = EventHandler<MouseEvent>;
        type TouchEventHandler = EventHandler<TouchEvent>;
        type UIEventHandler = EventHandler<UIEvent>;
        type WheelEventHandler = EventHandler<WheelEvent>;
        type AnimationEventHandler = EventHandler<AnimationEvent>;
        type TransitionEventHandler = EventHandler<TransitionEvent>;
        type GenericEventHandler = EventHandler<Event>;
        type PointerEventHandler = EventHandler<PointerEvent>;

        interface DOMAttributes {
            children?: ElementChild[]|ElementChild;

            // Image Events
            onLoad?: GenericEventHandler;
            onLoadCapture?: GenericEventHandler;
            onError?: GenericEventHandler;
            onErrorCapture?: GenericEventHandler;

            // Clipboard Events
            onCopy?: ClipboardEventHandler;
            onCopyCapture?: ClipboardEventHandler;
            onCut?: ClipboardEventHandler;
            onCutCapture?: ClipboardEventHandler;
            onPaste?: ClipboardEventHandler;
            onPasteCapture?: ClipboardEventHandler;

            // Composition Events
            onCompositionEnd?: CompositionEventHandler;
            onCompositionEndCapture?: CompositionEventHandler;
            onCompositionStart?: CompositionEventHandler;
            onCompositionStartCapture?: CompositionEventHandler;
            onCompositionUpdate?: CompositionEventHandler;
            onCompositionUpdateCapture?: CompositionEventHandler;

            // Details Events
            onToggle?: GenericEventHandler;

            // Focus Events
            onFocus?: FocusEventHandler;
            onFocusCapture?: FocusEventHandler;
            onBlur?: FocusEventHandler;
            onBlurCapture?: FocusEventHandler;

            // Form Events
            onChange?: GenericEventHandler;
            onChangeCapture?: GenericEventHandler;
            onInput?: GenericEventHandler;
            onInputCapture?: GenericEventHandler;
            onSearch?: GenericEventHandler;
            onSearchCapture?: GenericEventHandler;
            onSubmit?: GenericEventHandler;
            onSubmitCapture?: GenericEventHandler;
            onInvalid?: GenericEventHandler;
            onInvalidCapture?: GenericEventHandler;
            onReset?: GenericEventHandler;
            onResetCapture?: GenericEventHandler;
            onFormData?: GenericEventHandler;
            onFormDataCapture?: GenericEventHandler;

            // Keyboard Events
            onKeyDown?: KeyboardEventHandler;
            onKeyDownCapture?: KeyboardEventHandler;
            onKeyPress?: KeyboardEventHandler;
            onKeyPressCapture?: KeyboardEventHandler;
            onKeyUp?: KeyboardEventHandler;
            onKeyUpCapture?: KeyboardEventHandler;

            // Media Events
            onAbort?: GenericEventHandler;
            onAbortCapture?: GenericEventHandler;
            onCanPlay?: GenericEventHandler;
            onCanPlayCapture?: GenericEventHandler;
            onCanPlayThrough?: GenericEventHandler;
            onCanPlayThroughCapture?: GenericEventHandler;
            onDurationChange?: GenericEventHandler;
            onDurationChangeCapture?: GenericEventHandler;
            onEmptied?: GenericEventHandler;
            onEmptiedCapture?: GenericEventHandler;
            onEncrypted?: GenericEventHandler;
            onEncryptedCapture?: GenericEventHandler;
            onEnded?: GenericEventHandler;
            onEndedCapture?: GenericEventHandler;
            onLoadedData?: GenericEventHandler;
            onLoadedDataCapture?: GenericEventHandler;
            onLoadedMetadata?: GenericEventHandler;
            onLoadedMetadataCapture?: GenericEventHandler;
            onLoadStart?: GenericEventHandler;
            onLoadStartCapture?: GenericEventHandler;
            onPause?: GenericEventHandler;
            onPauseCapture?: GenericEventHandler;
            onPlay?: GenericEventHandler;
            onPlayCapture?: GenericEventHandler;
            onPlaying?: GenericEventHandler;
            onPlayingCapture?: GenericEventHandler;
            onProgress?: GenericEventHandler;
            onProgressCapture?: GenericEventHandler;
            onRateChange?: GenericEventHandler;
            onRateChangeCapture?: GenericEventHandler;
            onSeeked?: GenericEventHandler;
            onSeekedCapture?: GenericEventHandler;
            onSeeking?: GenericEventHandler;
            onSeekingCapture?: GenericEventHandler;
            onStalled?: GenericEventHandler;
            onStalledCapture?: GenericEventHandler;
            onSuspend?: GenericEventHandler;
            onSuspendCapture?: GenericEventHandler;
            onTimeUpdate?: GenericEventHandler;
            onTimeUpdateCapture?: GenericEventHandler;
            onVolumeChange?: GenericEventHandler;
            onVolumeChangeCapture?: GenericEventHandler;
            onWaiting?: GenericEventHandler;
            onWaitingCapture?: GenericEventHandler;

            // MouseEvents
            onClick?: MouseEventHandler;
            onClickCapture?: MouseEventHandler;
            onContextMenu?: MouseEventHandler;
            onContextMenuCapture?: MouseEventHandler;
            onDblClick?: MouseEventHandler;
            onDblClickCapture?: MouseEventHandler;
            onDrag?: DragEventHandler;
            onDragCapture?: DragEventHandler;
            onDragEnd?: DragEventHandler;
            onDragEndCapture?: DragEventHandler;
            onDragEnter?: DragEventHandler;
            onDragEnterCapture?: DragEventHandler;
            onDragExit?: DragEventHandler;
            onDragExitCapture?: DragEventHandler;
            onDragLeave?: DragEventHandler;
            onDragLeaveCapture?: DragEventHandler;
            onDragOver?: DragEventHandler;
            onDragOverCapture?: DragEventHandler;
            onDragStart?: DragEventHandler;
            onDragStartCapture?: DragEventHandler;
            onDrop?: DragEventHandler;
            onDropCapture?: DragEventHandler;
            onMouseDown?: MouseEventHandler;
            onMouseDownCapture?: MouseEventHandler;
            onMouseEnter?: MouseEventHandler;
            onMouseEnterCapture?: MouseEventHandler;
            onMouseLeave?: MouseEventHandler;
            onMouseLeaveCapture?: MouseEventHandler;
            onMouseMove?: MouseEventHandler;
            onMouseMoveCapture?: MouseEventHandler;
            onMouseOut?: MouseEventHandler;
            onMouseOutCapture?: MouseEventHandler;
            onMouseOver?: MouseEventHandler;
            onMouseOverCapture?: MouseEventHandler;
            onMouseUp?: MouseEventHandler;
            onMouseUpCapture?: MouseEventHandler;

            // Selection Events
            onSelect?: GenericEventHandler;
            onSelectCapture?: GenericEventHandler;

            // Touch Events
            onTouchCancel?: TouchEventHandler;
            onTouchCancelCapture?: TouchEventHandler;
            onTouchEnd?: TouchEventHandler;
            onTouchEndCapture?: TouchEventHandler;
            onTouchMove?: TouchEventHandler;
            onTouchMoveCapture?: TouchEventHandler;
            onTouchStart?: TouchEventHandler;
            onTouchStartCapture?: TouchEventHandler;

            // Pointer Events
            onPointerOver?: PointerEventHandler;
            onPointerOverCapture?: PointerEventHandler;
            onPointerEnter?: PointerEventHandler;
            onPointerEnterCapture?: PointerEventHandler;
            onPointerDown?: PointerEventHandler;
            onPointerDownCapture?: PointerEventHandler;
            onPointerMove?: PointerEventHandler;
            onPointerMoveCapture?: PointerEventHandler;
            onPointerUp?: PointerEventHandler;
            onPointerUpCapture?: PointerEventHandler;
            onPointerCancel?: PointerEventHandler;
            onPointerCancelCapture?: PointerEventHandler;
            onPointerOut?: PointerEventHandler;
            onPointerOutCapture?: PointerEventHandler;
            onPointerLeave?: PointerEventHandler;
            onPointerLeaveCapture?: PointerEventHandler;
            onGotPointerCapture?: PointerEventHandler;
            onGotPointerCaptureCapture?: PointerEventHandler;
            onLostPointerCapture?: PointerEventHandler;
            onLostPointerCaptureCapture?: PointerEventHandler;

            // UI Events
            onScroll?: UIEventHandler;
            onScrollCapture?: UIEventHandler;

            // Wheel Events
            onWheel?: WheelEventHandler;
            onWheelCapture?: WheelEventHandler;

            // Animation Events
            onAnimationStart?: AnimationEventHandler;
            onAnimationStartCapture?: AnimationEventHandler;
            onAnimationEnd?: AnimationEventHandler;
            onAnimationEndCapture?: AnimationEventHandler;
            onAnimationIteration?: AnimationEventHandler;
            onAnimationIterationCapture?: AnimationEventHandler;

            // Transition Events
            onTransitionEnd?: TransitionEventHandler;
            onTransitionEndCapture?: TransitionEventHandler;
        }

        type Attribute<T> = T|Property<T>;

        interface HTMLAttributes extends DOMAttributes {
            // Standard HTML Attributes
            accept?: Attribute<string>;
            acceptCharset?: Attribute<string>;
            accessKey?: Attribute<string>;
            action?: Attribute<string>;
            allowFullScreen?: Attribute<boolean>;
            allowTransparency?: Attribute<boolean>;
            alt?: Attribute<string>;
            as?: Attribute<string>;
            async?: Attribute<boolean>;
            autocomplete?: Attribute<string>;
            autoComplete?: Attribute<string>;
            autocorrect?: Attribute<string>;
            autoCorrect?: Attribute<string>;
            autofocus?: Attribute<boolean>;
            autoFocus?: Attribute<boolean>;
            autoPlay?: Attribute<boolean>;
            capture?: Attribute<boolean | string>;
            cellPadding?: Attribute<number | string>;
            cellSpacing?: Attribute<number | string>;
            charSet?: Attribute<string>;
            challenge?: Attribute<string>;
            checked?: Attribute<boolean>;
            class?: Attribute<string>;
            // className?: Attribute<string>;
            cols?: Attribute<number>;
            colSpan?: Attribute<number>;
            content?: Attribute<string>;
            contentEditable?: Attribute<boolean>;
            contextMenu?: Attribute<string>;
            controls?: Attribute<boolean>;
            controlsList?: Attribute<string>;
            coords?: Attribute<string>;
            crossOrigin?: Attribute<string>;
            data?: Attribute<string>;
            dateTime?: Attribute<string>;
            default?: Attribute<boolean>;
            defer?: Attribute<boolean>;
            dir?: Attribute<"auto" | "rtl" | "ltr">;
            disabled?: Attribute<boolean>;
            disableRemotePlayback?: Attribute<boolean>;
            download?: Attribute<string>;
            draggable?: Attribute<boolean>;
            encType?: Attribute<string>;
            form?: Attribute<string>;
            formAction?: Attribute<string>;
            formEncType?: Attribute<string>;
            formMethod?: Attribute<string>;
            formNoValidate?: Attribute<boolean>;
            formTarget?: Attribute<string>;
            frameBorder?: Attribute<number | string>;
            headers?: Attribute<string>;
            height?: Attribute<number | string>;
            hidden?: Attribute<boolean>;
            high?: Attribute<number>;
            href?: Attribute<string>;
            hrefLang?: Attribute<string>;
            for?: Attribute<string>;
            htmlFor?: Attribute<string>;
            httpEquiv?: Attribute<string>;
            icon?: Attribute<string>;
            id?: Attribute<string>;
            inputMode?: Attribute<string>;
            integrity?: Attribute<string>;
            is?: Attribute<string>;
            keyParams?: Attribute<string>;
            keyType?: Attribute<string>;
            kind?: Attribute<string>;
            label?: Attribute<string>;
            lang?: Attribute<string>;
            list?: Attribute<string>;
            loading?: Attribute<"eager" | "lazy">;
            loop?: Attribute<boolean>;
            low?: Attribute<number>;
            manifest?: Attribute<string>;
            marginHeight?: Attribute<number>;
            marginWidth?: Attribute<number>;
            max?: Attribute<number | string>;
            maxLength?: Attribute<number>;
            media?: Attribute<string>;
            mediaGroup?: Attribute<string>;
            method?: Attribute<string>;
            min?: Attribute<number | string>;
            minLength?: Attribute<number>;
            multiple?: Attribute<boolean>;
            muted?: Attribute<boolean>;
            name?: Attribute<string>;
            nonce?: Attribute<string>;
            noValidate?: Attribute<boolean>;
            open?: Attribute<boolean>;
            optimum?: Attribute<number>;
            pattern?: Attribute<string>;
            placeholder?: Attribute<string>;
            playsInline?: Attribute<boolean>;
            poster?: Attribute<string>;
            preload?: Attribute<string>;
            radioGroup?: Attribute<string>;
            readOnly?: Attribute<boolean>;
            rel?: Attribute<string>;
            required?: Attribute<boolean>;
            role?: Attribute<string>;
            rows?: Attribute<number>;
            rowSpan?: Attribute<number>;
            sandbox?: Attribute<string>;
            scope?: Attribute<string>;
            scoped?: Attribute<boolean>;
            scrolling?: Attribute<string>;
            seamless?: Attribute<boolean>;
            selected?: Attribute<boolean>;
            shape?: Attribute<string>;
            size?: Attribute<number>;
            sizes?: Attribute<string>;
            slot?: Attribute<string>;
            span?: Attribute<number>;
            spellcheck?: Attribute<boolean>;
            src?: Attribute<string>;
            srcset?: Attribute<string>;
            srcDoc?: Attribute<string>;
            srcLang?: Attribute<string>;
            srcSet?: Attribute<string>;
            start?: Attribute<number>;
            step?: Attribute<number | string>;
            style?: Attribute<string | Partial<CSSStyleDeclaration>>;
            summary?: Attribute<string>;
            tabIndex?: Attribute<number>;
            target?: Attribute<string>;
            title?: Attribute<string>;
            type?: Attribute<string>;
            useMap?: Attribute<string>;
            value?: Attribute<string | string[] | number>;
            volume?: Attribute<string | number>;
            width?: Attribute<number | string>;
            wmode?: Attribute<string>;
            wrap?: Attribute<string>;

            // RDFa Attributes
            about?: Attribute<string>;
            datatype?: Attribute<string>;
            inlist?: Attribute<boolean>;
            prefix?: Attribute<string>;
            property?: Attribute<string>;
            resource?: Attribute<string>;
            typeof?: Attribute<string>;
            vocab?: Attribute<string>;

            // Microdata Attributes
            itemProp?: Attribute<string>;
            itemScope?: Attribute<boolean>;
            itemType?: Attribute<string>;
            itemID?: Attribute<string>;
            itemRef?: Attribute<string>;
        }
        type IntrinsicElementsHTML = { [TKey in keyof HTMLElementTagNameMap]?: HTMLAttributes };

        type IntrinsicElements = IntrinsicElementsHTML;
    }
}
