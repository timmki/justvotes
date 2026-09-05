import type {KeyboardEvent as ReactKeyboardEvent} from 'react';
import {Link} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {ChevronRightIcon} from '../../shared/ui/Icons';
import {formatTimestamp} from './pollFormatters';
import {pollStateTranslationKey, type Poll} from './pollProjections';

export type PublicPoll = Poll;

export function PublicPollCard({poll, featured = false}: {poll: PublicPoll; featured?: boolean}) {
    const {locale, t} = useI18n();
    return <Link className={featured ? 'poll-card featured-poll-card' : 'poll-card'}
                 to={`/poll/${encodeURIComponent(poll.id)}`} onKeyDown={activateOnKeyDown}
                 onKeyUp={activateOnSpaceUp}>
        <span className="poll-card-heading">
            <strong>{poll.title}</strong>
            <span className="poll-vote-badge" aria-label={`${poll.totalVotes} ${t('polls.votes')}`}>{poll.totalVotes}</span>
        </span>
        <span className="poll-card-meta">
            <span className="poll-card-state">{t(pollStateTranslationKey(poll.state))}</span>
            <span>{t('polls.createdBy')} {t('common.admin')}</span>
            <time dateTime={poll.createdAt}>{formatTimestamp(poll.createdAt, locale)}</time>
            <span className="poll-card-arrow"><ChevronRightIcon/></span>
        </span>
    </Link>;
}

function activateOnKeyDown(event: ReactKeyboardEvent<HTMLAnchorElement>) {
    if (event.key === ' ') event.preventDefault();
    if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.click();
    }
}

function activateOnSpaceUp(event: ReactKeyboardEvent<HTMLAnchorElement>) {
    if (event.key === ' ') {
        event.preventDefault();
        event.currentTarget.click();
    }
}
