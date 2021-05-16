import { createElement, bind, mount, Cond, bindList, loop } from "../src/component";
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

const tasks = bindList<string>();
const task = new TextControl('');

function addTask(e: Event) {
    e.preventDefault();
    tasks.push(task.value);
    task.value = '';
}

const component = <div class='stack-column padding spacing'>
    <div class='stack-row spacing align-center'>
        <Field control={text}>
            <label>Label</label>
            <input type='text'/>
        </Field>
        <div>{_('"{text}" typed', {text})}</div>
    </div>
    <div class='stack-row spacing align-center'>
        <button onClick={() => {n.value++;}}>Button</button>
        <div>{_n('Clicked {n} time', 'Clicked {n} times', {n})}</div>
    </div>
    <Cond when={n.map(n => n > 10)}>
        <div>
            Clicked more than 10 times
        </div>
    </Cond>
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
    <div>Todo:</div>
    <div class='list' role='listbox'>
        {loop(tasks, task => (
            <div role='option'>{task}</div>
        ))}
    </div>
    <form class='stack-row spacing align-center' onSubmit={addTask}>
        <Field control={task}>
            <label>Add task</label>
            <input type='text'/>
        </Field>
        <button type='submit'>Add</button>
    </form>
</div>;

mount(document.body, component);
