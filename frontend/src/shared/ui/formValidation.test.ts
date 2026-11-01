import {describe, expect, it} from 'vitest';
import {focusFirstInvalid} from './formValidation';

describe('focusFirstInvalid', () => {
    it('focuses the first invalid control of the form', () => {
        const form = document.createElement('form');
        form.innerHTML = '<input id="a"><input id="b" aria-invalid="true"><input id="c" aria-invalid="true">';
        document.body.append(form);

        focusFirstInvalid(form);

        expect(document.activeElement?.id).toBe('b');
        form.remove();
    });

    it('does nothing without invalid controls or form', () => {
        const form = document.createElement('form');
        form.innerHTML = '<input id="a">';
        document.body.append(form);
        const previous = document.activeElement;

        focusFirstInvalid(form);
        focusFirstInvalid(null);

        expect(document.activeElement).toBe(previous);
        form.remove();
    });
});
