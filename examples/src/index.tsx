import { createElement, mount, Show, For, zipWith, ref, ariaBool, Context, createRouter, Link, cellArray, cell, Cell, $, createInterval, TextControl, Field, IntControl, _, _n } from "cytoplasmic";
import 'classic-stylesheets/layout.css';
import 'classic-stylesheets/themes/win9x/theme.css';
import 'classic-stylesheets/themes/win9x/skins/95.css';

const text = new TextControl('');
const n = cell(0);
const a = new TextControl('2');
const b = new TextControl('3');
//const c = zipWith([a, b], (a, b) => parseInt(a) + parseInt(b));
const c = $(() => parseInt($(a)) + parseInt($(b)));

const showCounter = cell(true);

const tasks = cellArray<string>(['Buy milk']);
const task = new TextControl('');

const selection = ref<number>();

function addTask(e: Event) {
    e.preventDefault();
    tasks.push(task.value);
    task.value = '';
}

function insertTask(e: Event) {
    e.preventDefault();
    if (selection.value != undefined) {
        tasks.insert(selection.value, task.value);
    } else {
        tasks.insert(0, task.value);
    }
    task.value = '';
}

function removeTask() {
    if (selection.value != undefined) {
        tasks.remove(selection.value);
        if (tasks.length.value) {
            selection.value = Math.max(0, selection.value - 1);
        } else {
            selection.value = undefined;
        }
    }
}

function moveTaskUp() {
    if (selection.value != undefined && selection.value > 0) {
        const removed = tasks.remove(selection.value);
        if (removed) {
            tasks.insert(selection.value - 1, removed);
            selection.value--;
        }
    }
}

function moveTaskDown() {
    if (selection.value != undefined && selection.value < tasks.items.length - 1) {
        const removed = tasks.remove(selection.value);
        if (removed) {
            tasks.insert(selection.value + 1, removed);
            selection.value++;
        }
    }
}

function Counter(): JSX.Element {
    const interval = createInterval(1000);
    const count = Cell.from(interval.indexed().map(x => x + 1), 0);
    return <div>The count is {count}</div>;
}

function TemperatureConverter() {
    const celcius = new IntControl(5);
    const fahrenheit = new IntControl(celcius.bimap(
        c => c * 9 / 5 + 32,
        f => (f - 32) * 5 / 9,
    ));
    return <div class='stack-row spacing align-center'>
        <Field control={celcius}>
            <input type='text'/>
            <label>Celcius =</label>
        </Field>
        <Field control={fahrenheit}>
            <input type='text'/>
            <label>Fahrenheit</label>
        </Field>
    </div>;
}

function RoutingNav() {
    return <div class='stack-row spacing'>
        <div>Menu:</div>
        <Link path=''><a>Dashboard</a></Link>
        <Link path='users'><a>Users</a></Link>
        <Link path='lazy'><a>Lazy</a></Link>
    </div>;
}

function RoutingDashboard() {
    return <div>
        <h3>Dashboard</h3>
        <p>Welcome to the routing example</p>
    </div>;
}

function RoutingUsers() {
    return <div>
        <h3>Users</h3>
        <div>
            <Link path='./1'><a>User 1</a></Link>
        </div>
        <div>
            <Link path='/users/2'><a>User 2</a></Link>
        </div>
    </div>;
}

function RoutingUser({userId}: {userId: string}) {
    return <div>
        <h3>User {userId}</h3>
        <p>Details for user {userId}</p>
        <p><Link path='./subroutes'><a>Subroutes</a></Link></p>
        <p><Link path='..'><a>Back</a></Link></p>
    </div>;
}

function RoutingNotFound() {
    return <div>
        <h3>Page not found</h3>
    </div>;
}

async function loadLazyRoute() {
    const m = await import('./lazy-route');
    await new Promise(resolve => setTimeout(resolve, 500));
    return <m.LazyRoute/>;
}

function SubroutingMain() {
    return <div>
        <h3>Main</h3>
        <Link path='page'><a>page</a></Link>
    </div>;
}

function SubroutingSubpage() {
    return <div>
        <h3>Page</h3>
    </div>;
}

function SubroutingNotFound() {
    return <div>
        <h3>Subpage not found</h3>
    </div>;
}

function SubroutingExample({userId}: {userId: string}) {
    const router = createRouter({
        '': () => <SubroutingMain/>,
        'page': () => <SubroutingSubpage/>,
        '**': () => <SubroutingNotFound/>,
    }, 'path');
    return <div>
        <h3>Subrouting</h3>
        <router.Provider>
            <div class='stack-row spacing'>
                <Link path=''><a>Main</a></Link>
                <Link path='page'><a>page</a></Link>
                <Link path={`/users/${userId}`}><a>back</a></Link>
            </div>
        </router.Provider>
        <router.Portal/>
    </div>
}

function RoutingExample() {
    const router = createRouter({
        '': () => <RoutingDashboard/>,
        'users': {
            '': () => <RoutingUsers/>,
            '*': userId => ({
                '': () => <RoutingUser userId={userId}/>,
                'subroutes': {
                    '**': () => <SubroutingExample userId={userId}/>,
                },
            }),
        },
        'lazy': () => loadLazyRoute(),
        '**': () => <RoutingNotFound/>,
    }, 'path');
    return <div class='stack-column spacing'>
        <router.Provider>
            <RoutingNav/>
        </router.Provider>
        <router.Portal/>
    </div>;
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
    <div class="lowered">
        <div style={{backgroundColor: '#008', height: '20px', width: n.map(n => `${n}px`)}}></div>
    </div>
    <div>
        <Show when={n.map(n => n > 10)} else='Clicked less than 10 times'>
            Clicked more than 10 times
        </Show>
    </div>
    <div class='stack-row align-center'>
        <Field control={a}>
            <input type='text'/>
        </Field>
        +
        <Field control={b}>
            <input type='text'/>
        </Field>
        = {c}
    </div>
    <div class='stack-row spacing align-center'>
        <button onClick={() => {showCounter.value = !showCounter.value;}}>
            {showCounter.map(x => x ? 'Hide counter' : 'Show counter')}
        </button>
        <Show when={showCounter}>
            <Show when={showCounter}>
                <Counter/>
            </Show>
        </Show>
    </div>
    <h2>Todo list</h2>
    <div class='stack-row align-center spacing'>
        <div>{_n('{n} task', '{n} tasks', {n: tasks.length})}</div>
        <button disabled={selection.undefined} onClick={removeTask}>Remove</button>
        <button disabled={selection.undefined} onClick={moveTaskUp}>Up</button>
        <button disabled={selection.undefined} onClick={moveTaskDown}>Down</button>
    </div>
    <div class='list' role='listbox'>
        <For each={tasks.indexed}>
            {(task, index) => (
                <div role='option' tabIndex={0} aria-selected={ariaBool(index.eq(selection))}
                    onClick={() => selection.value = index.value}>
                    {index.map(i => i + 1)}: {task}
                </div>
            )}
        </For>
    </div>
    <form class='stack-row spacing align-center' onSubmit={addTask}>
        <Field control={task}>
            <label>Add task</label>
            <input type='text'/>
        </Field>
        <button type='submit' disabled={task.not}>Add</button>
        <button onClick={insertTask} disabled={task.not}>Insert</button>
    </form>
    <div>Mapped:</div>
    <div class='list' role='listbox'>
        <For each={tasks.map(x => x.toUpperCase())}>
            {(task) => (
                <div role='option'>
                    {task}
                </div>
            )}
        </For>
    </div>
    <div>Filtered (starts with "buy"):</div>
    <div class='list' role='listbox'>
        <For each={tasks.filter(x => x.toLowerCase().startsWith('buy'))}>
            {(task) => (
                <div role='option'>
                    {task}
                </div>
            )}
        </For>
    </div>
    <h2>Temperature converter</h2>
    <TemperatureConverter/>
    <h2>Router</h2>
    <RoutingExample/>
</div>;

mount(document.body, component);

