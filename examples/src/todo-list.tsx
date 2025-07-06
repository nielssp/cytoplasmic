import { _n, ariaBool, cellArray, createElement, Field, For, ref, TextControl } from 'cytoplasmic';

export function TodoList() {

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

    return <div class='flex-column gap'>
        <div class='flex-row align-center gap'>
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
        <form class='flex-row gap align-center' onSubmit={addTask}>
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
    </div>;
}
