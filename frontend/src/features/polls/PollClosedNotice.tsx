import {Link} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {Poll} from './pollProjections';

/**
 * Tells why a poll no longer takes votes and leads straight to its results (spec 009, US2).
 */
export function PollClosedNotice({poll, resultsAvailable, resultsPending}: {
    poll: Poll;
    resultsAvailable: boolean;
    resultsPending: boolean;
}) {
    const {t} = useI18n();
    let reasonKey: 'polls.closedExpired' | 'polls.closedArchived' | 'polls.closedOther' = 'polls.closedOther';
    if (poll.state === 'expired') reasonKey = 'polls.closedExpired';
    if (poll.state === 'archived') reasonKey = 'polls.closedArchived';
    return <div className="poll-closed-notice">
        <p>{t(reasonKey)}</p>
        {resultsAvailable && <Link className="primary-button" to={`/poll/results/${encodeURIComponent(poll.id)}`}>
            {t('polls.viewResults')}
        </Link>}
        {!resultsAvailable && resultsPending && <p className="poll-closed-results-state" role="status">{t('polls.resultsLoading')}</p>}
        {!resultsAvailable && !resultsPending && <p className="poll-closed-results-state">{t('polls.resultsNotReleased')}</p>}
    </div>;
}

/**
 * The options of a poll that no longer takes votes: a plain list, with the own vote marked.
 */
export function ClosedOptionList({poll, currentOptionNumber}: { poll: Poll; currentOptionNumber: number | null }) {
    const {t, locale} = useI18n();
    const headingId = `closed-options-${poll.id}`;
    const sortedOptions = [...poll.options].sort((left, right) => left.text.localeCompare(right.text, locale));
    return <section className="closed-option-list" aria-labelledby={headingId}>
        <h2 id={headingId}>{t('polls.options')}</h2>
        <ul>{sortedOptions.map((option) => {
            const current = option.number === currentOptionNumber;
            let className: string | undefined;
            if (current) className = 'current';
            return <li key={option.number} className={className}>
                <strong>{option.text}</strong>{current && <small>{t('polls.yourVote')}</small>}
            </li>;
        })}</ul>
    </section>;
}
