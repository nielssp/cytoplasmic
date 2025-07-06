import { createElement, mount, _, _n } from "cytoplasmic";

import './style.css';
import 'classic-stylesheets/layout.css';
import 'classic-stylesheets/themes/win9x/theme.css';
import 'classic-stylesheets/themes/win9x/skins/95.css';

import { TemperatureConverter } from './temperature-converter';
import { RoutingExample } from './routing';
import { TextInput } from './text-input';
import { ComputedExample } from './computed';
import { Timer } from './timer';
import { TodoList } from './todo-list';

const component = <div class='flex-column padding gap'>
    <h2>Text input</h2>
    <TextInput/>
    <h2>Computed</h2>
    <ComputedExample/>
    <h2>Timer</h2>
    <Timer/>
    <h2>Todo list</h2>
    <TodoList/>
    <h2>Temperature converter</h2>
    <TemperatureConverter/>
    <h2>Router</h2>
    <RoutingExample/>
</div>;

mount(document.body, component);

