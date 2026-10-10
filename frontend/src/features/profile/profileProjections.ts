import type {components} from '../../shared/api/generated/justvotes';
import type {Locale, TranslationKey} from '../../shared/i18n/translations';

export type PersonalVote = components['schemas']['PersonalVote'];
const stateKeys: Record<PersonalVote['poll']['state'], TranslationKey> = {
    active: 'profile.active', expired: 'profile.expired', archived: 'profile.archived',
};
export function projectPersonalVotes(votes: PersonalVote[], locale: Locale, t: (key: TranslationKey) => string) {
    return [...votes].sort((a, b) => {
        const votedAt = Date.parse(b.votedAt) - Date.parse(a.votedAt);
        if (votedAt) return votedAt;
        if (a.poll.id < b.poll.id) return -1;
        if (a.poll.id > b.poll.id) return 1;
        return 0;
    }).map(vote => ({
        pollId: vote.poll.id,
        title: vote.poll.title,
        state: t(stateKeys[vote.poll.state]),
        option: vote.option.text,
        optionNumber: vote.option.number,
        votedAt: vote.votedAt,
        timestamp: new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'long', timeZone: 'UTC'}).format(new Date(vote.votedAt)),
    }));
}
