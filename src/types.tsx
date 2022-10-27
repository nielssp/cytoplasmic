import { Property, ValueProperty } from "./property";

export type ElementChild = HTMLElement|string|number|Property<string>|Property<number>|JSX.Element|ElementChild[];

export type IntrinsicElementsHTML = { [TKey in keyof HTMLElementTagNameMap]?: HTMLAttributes & {
    ref?: ValueProperty<HTMLElementTagNameMap[TKey]|undefined>
}};

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
    class?: Attribute<string> | Record<string, Attribute<boolean>>;
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
    style?: Attribute<string | {
        [TKey in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[TKey]|Property<CSSStyleDeclaration[TKey]>
    }>;
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
