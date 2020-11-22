import { Panel, StackColumn, StackRow, Label, elem, InputLabel, createId, TextInput, Button } from "../src/component";
import { Property } from "../src/emitter";
import { _, _n } from "../src/i18n";

import './classic-stylesheets/layout.css';
import './classic-stylesheets/themes/win9x/theme.css';
import './classic-stylesheets/themes/win9x/skins/95.css';

const inputId = createId();
const text = new Property('');
const n = new Property(0);
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
</StackColumn>;

document.getElementById('example1')?.appendChild(example.elem);
example.init();
