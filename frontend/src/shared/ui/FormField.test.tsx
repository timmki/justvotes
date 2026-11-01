import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {FormField} from './FormField';

function description(element: HTMLElement) {
    return (element.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent).join(' ');
}

describe('FormField', () => {
    it('links the visible label to the control without error attributes by default', () => {
        render(<FormField id="name" label="Name"><input/></FormField>);
        const input = screen.getByLabelText('Name');
        expect(input.id).toBe('name');
        expect(input.hasAttribute('aria-invalid')).toBe(false);
        expect(input.hasAttribute('aria-describedby')).toBe(false);
    });

    it('describes the control with its hint', () => {
        render(<FormField id="filter" label="Vorlagen filtern" hint="* steht für beliebige Zeichen"><input/></FormField>);
        expect(description(screen.getByLabelText('Vorlagen filtern'))).toBe('* steht für beliebige Zeichen');
    });

    it('marks the control invalid and announces the error together with the hint', () => {
        render(<FormField id="email" label="E-Mail-Adresse" hint="Hinweis" error="Bitte fülle dieses Feld aus."><input/></FormField>);
        const input = screen.getByLabelText('E-Mail-Adresse');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toBe('email-hint email-error');
        expect(description(input)).toBe('Hinweis Bitte fülle dieses Feld aus.');
    });
});
