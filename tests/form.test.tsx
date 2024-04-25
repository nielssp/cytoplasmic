/** 
 * @jsx createElement
 * @jest-environment jsdom
 */

import { CheckboxControl, Field, IntControl, RadioGroup, TextControl, TextInputControl, cell, createElement, createId, ref } from '../src';
import { mountTest, numObservers } from './test-util';

describe('createId', () => {
    it('creates unique ids', () => {
        const a = createId('test');
        const b = createId('test');
        expect(a).not.toBe(b);
    });
});

describe('CheckboxControl', () => {
    it('sets id and initial value', () => {
        const control = new CheckboxControl(true, 'test');

        const label = ref<HTMLLabelElement>();
        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label ref={label}>label</label>
                <input ref={input} type='checkbox'/>
            </Field>
        );

        expect(label.value?.htmlFor).toBe('test');
        expect(input.value?.id).toBe('test');
        expect(input.value?.checked).toBe(true);

        element.destroy();
        expect(numObservers(control)).toBe(0);
    });

    it('can change value', () => {
        const control = new CheckboxControl(true);

        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='checkbox'/>
            </Field>
        );

        control.value = false;

        expect(input.value?.checked).toBe(false);

        element.destroy();

        control.value = true;
        expect(input.value?.checked).toBe(false);

        expect(numObservers(control)).toBe(0);
    });

    it('can be disabled', () => {
        const control = new CheckboxControl(true);
        control.disabled.value = true;

        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='checkbox'/>
            </Field>
        );

        expect(input.value?.disabled).toBe(true);

        control.disabled.value = false;

        expect(input.value?.disabled).toBe(false);

        element.destroy();

        control.disabled.value = true;
        expect(input.value?.disabled).toBe(false);

        expect(numObservers(control)).toBe(0);
        expect(numObservers(control.disabled)).toBe(0);
    });

    it('listens to change events', () => {
        const control = new CheckboxControl(true);

        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='checkbox'/>
            </Field>
        );

        input.value!.checked = false;
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(false);

        input.value!.checked = true;
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(true);

        element.destroy();

        input.value!.checked = false;
        input.value?.dispatchEvent(new Event('change'));
        expect(control.value).toBe(true);

        expect(numObservers(control)).toBe(0);
    });
});

describe('TextControl', () => {
    it('sets id, value, and disabled state of text inputs', () => {
        const control = new TextControl('foo', 'test');
        control.disabled.value = true;

        const label = ref<HTMLLabelElement>();
        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label ref={label}>label</label>
                <input ref={input} type='text'/>
            </Field>
        );

        expect(label.value?.htmlFor).toBe('test');
        expect(input.value?.id).toBe('test');
        expect(input.value?.value).toBe('foo');
        expect(input.value?.disabled).toBe(true);

        control.disabled.value = false;
        expect(input.value?.disabled).toBe(false);

        control.value = 'bar';
        expect(input.value?.value).toBe('bar');

        element.destroy();

        control.disabled.value = true;
        control.value = 'baz';
        
        expect(input.value?.value).toBe('bar');
        expect(input.value?.disabled).toBe(false);

        expect(numObservers(control)).toBe(0);
        expect(numObservers(control.disabled)).toBe(0);
    });

    it('sets id, value, and disabled state of textareas', () => {
        const control = new TextControl('foo', 'test');
        control.disabled.value = true;

        const label = ref<HTMLLabelElement>();
        const input = ref<HTMLTextAreaElement>();
        const element = mountTest(
            <Field control={control}>
                <label ref={label}>label</label>
                <textarea ref={input}/>
            </Field>
        );

        expect(label.value?.htmlFor).toBe('test');
        expect(input.value?.id).toBe('test');
        expect(input.value?.value).toBe('foo');
        expect(input.value?.disabled).toBe(true);

        control.disabled.value = false;
        expect(input.value?.disabled).toBe(false);

        control.value = 'bar';
        expect(input.value?.value).toBe('bar');

        element.destroy();

        control.disabled.value = true;
        control.value = 'baz';
        
        expect(input.value?.value).toBe('bar');
        expect(input.value?.disabled).toBe(false);

        expect(numObservers(control)).toBe(0);
        expect(numObservers(control.disabled)).toBe(0);
    });

    it('listens to change events', () => {
        const control = new TextControl('foo');

        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='text'/>
            </Field>
        );


        input.value!.value = 'bar';
        input.value?.dispatchEvent(new Event('change'));
        expect(control.value).toBe('bar');

        element.destroy();

        input.value!.value = 'baz';
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe('bar');
        
        expect(numObservers(control)).toBe(0);
    });

    it('listens to focus and blur events', () => {
        jest.useFakeTimers();

        const control = new TextControl('foo');

        const input = ref<HTMLInputElement>();
        const element = mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='text'/>
            </Field>
        );


        input.value!.value = 'bar';
        input.value?.dispatchEvent(new Event('focus'));
        expect(control.value).toBe('bar');

        input.value!.value = 'baz';
        expect(control.value).toBe('bar');
        jest.advanceTimersByTime(33);
        expect(control.value).toBe('baz');

        input.value?.dispatchEvent(new Event('blur'));

        input.value!.value = 'bazbar';
        jest.advanceTimersByTime(33);
        expect(control.value).toBe('baz');

        element.destroy();

        input.value!.value = 'foo';
        input.value?.dispatchEvent(new Event('focus'));

        expect(control.value).toBe('baz');
        
        expect(numObservers(control)).toBe(0);
    });
});

describe('IntControl', () => {
    it('parses typed values', () => {
        const control = new IntControl(0);

        const input = ref<HTMLInputElement>();
        mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='text'/>
            </Field>
        );

        expect(input.value?.value).toBe('0');

        input.value!.value = '5';
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(5);

        input.value!.value = '';
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(0);

        input.value!.value = '   -521   ';
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(-521);
    });

    it('stringifies control value', () => {
        const control = new IntControl(0);

        const input = ref<HTMLInputElement>();
        mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='text'/>
            </Field>
        );

        expect(input.value?.value).toBe('0');

        control.value = 152;
        expect(input.value?.value).toBe('152');

        control.value = -1512.25;
        expect(input.value?.value).toBe('-1513');
    });

    it('sets min and max', () => {
        const control = new IntControl(0);
        control.min = 0;
        control.max = 10;

        const input = ref<HTMLInputElement>();
        mountTest(
            <Field control={control}>
                <label>label</label>
                <input ref={input} type='text'/>
            </Field>
        );

        expect(input.value?.value).toBe('0');
        expect(input.value?.min).toBe('0');
        expect(input.value?.max).toBe('10');

        input.value!.value = '20';
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(10);

        input.value!.value = '-5';
        input.value?.dispatchEvent(new Event('change'));

        expect(control.value).toBe(0);
    });
});

describe('RadioGroup', () => {
    it('creates radio controls', () => {
        const group = new RadioGroup<'a' | 'b' | 'c'>('a', 'test');

        const label1 = ref<HTMLLabelElement>();
        const label2 = ref<HTMLLabelElement>();
        const label3 = ref<HTMLLabelElement>();

        const input1 = ref<HTMLInputElement>();
        const input2 = ref<HTMLInputElement>();
        const input3 = ref<HTMLInputElement>();

        const element = mountTest(
            <div>
                <Field control={group.get('a')}>
                    <input ref={input1} type='radio'/>
                    <label ref={label1}>label</label>
                </Field>
                <Field control={group.get('b')}>
                    <input ref={input2} type='radio'/>
                    <label ref={label2}>label</label>
                </Field>
                <Field control={group.get('c')}>
                    <input ref={input3} type='radio'/>
                    <label ref={label3}>label</label>
                </Field>
            </div>
        );

        expect(input1.value!.id).toBe(label1.value!.htmlFor);
        expect(input2.value!.id).toBe(label2.value!.htmlFor);
        expect(input3.value!.id).toBe(label3.value!.htmlFor);

        expect(input1.value!.checked).toBe(true);
        expect(input2.value!.checked).toBe(false);
        expect(input3.value!.checked).toBe(false);

        group.value = 'b';

        expect(input1.value!.checked).toBe(false);
        expect(input2.value!.checked).toBe(true);
        expect(input3.value!.checked).toBe(false);

        input3.value!.checked = true;
        input3.value?.dispatchEvent(new Event('change'));

        expect(group.value).toBe('c');
        expect(input1.value!.checked).toBe(false);
        expect(input2.value!.checked).toBe(false);
        expect(input3.value!.checked).toBe(true);

        group.disabled.value = true;

        expect(input1.value!.disabled).toBe(true);
        expect(input2.value!.disabled).toBe(true);
        expect(input3.value!.disabled).toBe(true);

        element.destroy();

        group.value = 'a';
        expect(input1.value!.checked).toBe(false);
        expect(input2.value!.checked).toBe(false);
        expect(input3.value!.checked).toBe(true);

        expect(numObservers(group)).toBe(0);
    });
});
