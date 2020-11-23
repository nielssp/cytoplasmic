import { elem, InputLabel, createId, TextInput, Button } from "../src/component";
import { Panel, StackColumn, StackRow, Label } from "../src/layout";
import { Property } from "../src/emitter";
import { _, _n } from "../src/i18n";

import './classic-stylesheets/layout.css';
import './classic-stylesheets/themes/win9x/theme.css';
import './classic-stylesheets/themes/win9x/skins/95.css';

const inputId = createId();
const text = new Property('');
const n = new Property(0);
const a = new Property('2');
const b = new Property('3');
const c = a.flatMap(a => b.map(b => parseInt(a) + parseInt(b)));
const example: Panel = <StackColumn spacing padding>
    <StackRow spacing alignItems='center'>
        <InputLabel inputId={inputId}>Label</InputLabel>
        <TextInput id={inputId} value={text}/>
        <Label>{_('"{text}" typed', {text})}</Label>
    </StackRow>
    <StackRow spacing alignItems='center'>
        <Button click={() => {n.value++;}}>Button</Button>
        <Label>{_n('Clicked {n} time', 'Clicked {n} times', {n})}</Label>
    </StackRow>
    <StackRow alignItems='center'>
        <TextInput value={a}/>
        +
        <TextInput value={b}/>
        =
        {c}
    </StackRow>
</StackColumn>;

document.getElementById('example1')?.appendChild(example.elem);
example.init();