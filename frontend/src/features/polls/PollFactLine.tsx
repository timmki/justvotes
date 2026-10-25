import {useI18n} from '../../shared/i18n/I18nProvider';
import type {Poll} from './pollProjections';
import {formatTimestamp, formatVoteCount} from './pollFormatters';
import {PollStateBadge} from './PollStateBadge';

export function PollFactLine({poll}: {poll: Poll}) {
    const {t, locale} = useI18n();
    return <p className="poll-fact-line">
        <PollStateBadge state={poll.state}/>
        {poll.endsAt && <>
            <span className="poll-fact-separator" aria-hidden="true">·</span>
            <span>{t('polls.endsAt')} <time dateTime={poll.endsAt}>{formatTimestamp(poll.endsAt, locale)}</time></span>
        </>}
        <span className="poll-fact-separator" aria-hidden="true">·</span>
        <span>{formatVoteCount(poll.totalVotes, locale, t)}</span>
    </p>;
}
