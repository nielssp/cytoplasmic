import { bind, createElement, ifDefined, Input, mount } from "./component";
import { InjectableClass, Injector } from "./injector";

export interface ViewModel {
    render(): JSX.Element;
}

export type ViewConstructor<T> = InjectableClass<T, ViewModel>;

export function Inject<T>(props: {
    view: Input<ViewConstructor<T>|undefined>,
    injector: Injector<T>,
}) {
    return ifDefined(bind(props.view), view => {
        return props.injector.inject(view).render();
    });
}

export function mountView<T>(container: HTMLElement, view: ViewConstructor<T>, injector: Injector<T>) {
    const viewProperty = bind<ViewConstructor<T>|undefined>(undefined);
    mount(container, <Inject view={viewProperty} injector={injector}/>)
    viewProperty.value = view;
}
