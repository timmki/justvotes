import type {Locale} from '../../shared/i18n/translations';

export function formatTimestamp(value: string, locale: Locale) {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}
