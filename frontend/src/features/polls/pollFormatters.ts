import type {Locale, TranslationKey} from '../../shared/i18n/translations';

export function formatTimestamp(value: string, locale: Locale) {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}

export function formatVoteCount(count: number, locale: Locale, t: (key: TranslationKey) => string) {
    const category = new Intl.PluralRules(locale).select(count);
    let key: TranslationKey = 'polls.voteCountOther';
    if (category === 'one') key = 'polls.voteCountOne';
    return t(key).replace('{count}', String(count));
}
