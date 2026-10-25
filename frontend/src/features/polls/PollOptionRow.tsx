import {useEffect, useRef, type MouseEvent} from 'react';
import type {FrontendError} from '../../shared/api/errors';
import {useI18n} from '../../shared/i18n/I18nProvider';

type PollOptionRowProps = {
    option: { number: number; text: string };
    name: string;
    selected: boolean;
    current: boolean;
    showSubmit: boolean;
    pending: boolean;
    disabled: boolean;
    error: FrontendError | null;
    onSelect: () => void;
};

// One option of the poll. The confirm button lives in the selected row (spec 005). The hidden ghost copy keeps the
// row at the height the text has without the button, and the visible text is clamped to that line count.
export function PollOptionRow({option, name, selected, current, showSubmit, pending, disabled, error, onSelect}: PollOptionRowProps) {
    const {t} = useI18n();
    const rowRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const row = rowRef.current;
        const ghost = ghostRef.current;
        const strong = ghost?.querySelector('strong');
        if (!showSubmit || !row || !ghost || !strong || typeof ResizeObserver === 'undefined') return undefined;
        const measure = () => {
            const lineHeight = parseFloat(getComputedStyle(strong).lineHeight);
            if (!(lineHeight > 0)) return;
            const lines = Math.max(1, Math.round(ghost.getBoundingClientRect().height / lineHeight));
            row.style.setProperty('--option-lines', String(lines));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(ghost);
        measure();
        return () => {
            observer.disconnect();
            row.style.removeProperty('--option-lines');
        };
    }, [showSubmit, option.text]);

    // A click on the row's padding selects the option, as the whole row did before (spec 005, U6). Clicks on the
    // button or the error do not select anything.
    function selectFromRow(event: MouseEvent<HTMLDivElement>) {
        if (disabled) return;
        const target = event.target as HTMLElement;
        if (target.closest('button, .poll-option-error')) return;
        onSelect();
    }

    let className = 'poll-option';
    if (selected) className += ' selected';
    if (current) className += ' current';
    if (showSubmit) className += ' with-submit';

    return <div ref={rowRef} className={className} onClick={selectFromRow}>
        <label className="poll-option-label">
            <input type="radio" name={name} value={option.number} aria-label={option.text}
                   checked={selected} onChange={onSelect}/>
            <span className="poll-option-text"><strong>{option.text}</strong>{current && <small>{t('polls.yourVote')}</small>}</span>
        </label>
        {showSubmit && <span ref={ghostRef} className="poll-option-ghost" aria-hidden="true"><strong>{option.text}</strong></span>}
        {showSubmit && <button className="poll-option-submit" type="submit" disabled={pending} aria-busy={pending}
                               aria-label={t('polls.submitVoteFor').replace('{option}', () => option.text)}>
            {pending && <span className="button-spinner" aria-hidden="true"/>}
            {!pending && <svg className="poll-option-submit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>}
            <span className="poll-option-submit-text">{t('polls.submitVote')}</span>
        </button>}
        {error && <p className="form-error poll-option-error" role="alert">{t(error.messageKey)}</p>}
    </div>;
}
