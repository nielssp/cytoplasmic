import { createElement, Field, IntControl } from 'cytoplasmic';

export function TemperatureConverter() {
    const celcius = new IntControl(5);
    const fahrenheit = new IntControl(celcius.bimap(
        c => c * 9 / 5 + 32,
        f => (f - 32) * 5 / 9,
    ));
    return <div class='flex-row gap align-center'>
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
