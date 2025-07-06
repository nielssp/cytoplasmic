import { _, createElement, Field, TextControl } from 'cytoplasmic';

export function TextInput() {
    const text = new TextControl('');
    return <div class='flex-row gap align-center'>
        <Field control={text}>
            <label>Label</label>
            <input type='text'/>
        </Field>
        <div>{_('"{text}" typed', {text})}</div>
    </div>;
}
