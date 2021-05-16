import { createElement, bind, mount } from "../src/component";
import { TextControl, Field } from "../src/form";
import { _, _n } from "../src/i18n";

import './classic-stylesheets/layout.css';
import './classic-stylesheets/themes/win9x/theme.css';
import './classic-stylesheets/themes/win9x/skins/95.css';

const text = new TextControl('');
const n = bind(0);
const a = new TextControl('2');
const b = new TextControl('3');
const c = a.flatMap(a => b.map(b => parseInt(a) + parseInt(b)));
const example = <div class='stack-column padding spacing'>
    <div class='stack-row spacing align-center'>
        <Field control={text}>
            <input type='text'/>
        </Field>
        <div>{_('"{text}" typed', {text})}</div>
    </div>
    <div class='stack-row spacing align-center'>
        <button onClick={() => {n.value++;}}>Button</button>
        <div>{_n('Clicked {n} time', 'Clicked {n} times', {n})}</div>
    </div>
    <div class='stack-row align-center'>
        <Field control={a}>
            <input type='text'/>
        </Field>
        +
        <Field control={b}>
            <input type='text'/>
        </Field>
        =
        {c}
    </div>
</div>;

mount(document.body, example);
