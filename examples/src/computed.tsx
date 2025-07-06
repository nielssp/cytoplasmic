import { computed, createElement, Field, TextControl } from 'cytoplasmic';

export function ComputedExample() {
    const a = new TextControl('2');
    const b = new TextControl('3');
    const c = computed(of => parseInt(of(a)) + parseInt(of(b)));
    return <div class='flex-row align-center'>
        <Field control={a}>
            <input type='text'/>
        </Field>
        +
        <Field control={b}>
            <input type='text'/>
        </Field>
        = {c}
    </div>;
}
