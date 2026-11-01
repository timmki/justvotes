/**
 * Moves focus to the first control the last submit attempt marked invalid.
 */
export function focusFirstInvalid(form: HTMLFormElement | null) {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
