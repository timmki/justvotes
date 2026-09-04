import type {KeyboardEvent as ReactKeyboardEvent} from 'react';
import {Link} from 'react-router-dom';
import type {components} from '../../shared/api/generated/justvotes';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {ChevronRightIcon} from '../../shared/ui/Icons';

export type PublicPoll = components['schemas']['Poll'];

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
            <span className="poll-id">{poll.id}</span>
            <span className="poll-card-arrow"><ChevronRightIcon/></span>
        </span>
    </Link>;
}

function pollStateTranslationKey(state: PublicPoll['state']): TranslationKey {
    const keys: Record<PublicPoll['state'], TranslationKey> = {
        draft: 'admin.stateDraft',
        active: 'admin.stateActive',
        expired: 'admin.stateExpired',
        archived: 'admin.stateArchived',
        deleted: 'admin.stateDeleted',
    };
    return keys[state];
}

function formatTimestamp(value: string, locale: 'de' | 'en') {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
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
