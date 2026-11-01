import {cloneElement, type ReactElement} from 'react';

type ControlProps = {
    id?: string;
    'aria-invalid'?: boolean | 'true' | 'false';
    'aria-describedby'?: string;
};

/**
 * One labelled form control: label above, optional hint and error below, both announced with the control.
 */
export function FormField({id, label, hint, error, invalid = false, describedBy: extraDescribedBy, className, children}: {
    id: string;
    label: string;
    hint?: string;
    error?: string | null;
    /** Marks the control invalid when its message is shown elsewhere, e.g. in the form's alert. */
    invalid?: boolean;
    /** Ids of further descriptions shown outside the field, read before the hint. */
    describedBy?: string;
    className?: string;
    children: ReactElement<ControlProps>;
}) {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy: string[] = [];
    if (extraDescribedBy) describedBy.push(extraDescribedBy);
    if (hint) describedBy.push(hintId);
    if (error) describedBy.push(errorId);
    const controlProps: ControlProps = {id};
    if (describedBy.length) controlProps['aria-describedby'] = describedBy.join(' ');
    if (error || invalid) controlProps['aria-invalid'] = true;
    let fieldClassName = 'form-field';
    if (className) fieldClassName += ` ${className}`;
    return <div className={fieldClassName}>
        <label htmlFor={id}>{label}</label>
        {cloneElement(children, controlProps)}
        {hint && <p id={hintId} className="field-hint">{hint}</p>}
        {error && <p id={errorId} className="field-error">{error}</p>}
    </div>;
}
