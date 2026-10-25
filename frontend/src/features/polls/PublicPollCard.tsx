import {useId, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {Link} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {ChevronRightIcon} from '../../shared/ui/Icons';
import {formatTimestamp, formatVoteCount} from './pollFormatters';
import {PollStateBadge} from './PollStateBadge';
import type {Poll} from './pollProjections';

export type PublicPoll = Poll;

export function PublicPollCard({poll, featured = false}: {poll: PublicPoll; featured?: boolean}) {
    const {locale, t} = useI18n();
    const titleId = useId();
    const stateId = useId();
    const metaId = useId();
    let className = 'poll-card';
    if (featured) className += ' featured-poll-card';
    return <Link className={className}
                 to={`/poll/${encodeURIComponent(poll.id)}`} onKeyDown={activateOnKeyDown}
                 onKeyUp={activateOnSpaceUp} aria-labelledby={`${titleId} ${stateId}`} aria-describedby={metaId}>
        <span className="poll-card-heading">
            <strong id={titleId}>{poll.title}</strong>
        </span>
        <span className="poll-card-meta" id={metaId}>
            <PollStateBadge state={poll.state} id={stateId}/>
            <span>{formatVoteCount(poll.totalVotes, locale, t)}</span>
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
