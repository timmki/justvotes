import {useEffect, type RefObject} from 'react';

export function useDialogFocusTrap(dialogRef: RefObject<HTMLDivElement | null>, onEscape: () => void) {
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ));
        const firstControl = focusable()[0];
        if (firstControl) firstControl.focus();
        else dialog.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onEscape();
                return;
            }
            if (event.key !== 'Tab') return;
            const controls = focusable();
            if (controls.length === 0) {
                event.preventDefault();
                dialog?.focus();
                return;
            }
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (!dialog?.contains(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [dialogRef, onEscape]);
}
