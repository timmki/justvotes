import {describe, expect, it} from 'vitest';
import {formatTimestamp, formatVoteCount} from './pollFormatters';
import {messages, type Locale, type TranslationKey} from '../../shared/i18n/translations';

describe('poll formatters', () => {
    it('formats the same timestamp using the requested locale', () => {
        const timestamp = '2026-08-01T10:00:00Z';

        expect(formatTimestamp(timestamp, 'de')).toContain('01.08.2026');
        expect(formatTimestamp(timestamp, 'en')).toContain('Aug 1, 2026');
    });

    it.each<[Locale, number, string]>([
        ['de', 0, '0 Stimmen'],
        ['de', 1, '1 Stimme'],
        ['de', 5, '5 Stimmen'],
        ['en', 0, '0 votes'],
        ['en', 1, '1 vote'],
        ['en', 5, '5 votes'],
    ])('formats vote count %i in %s as "%s"', (locale, count, expected) => {
        const t = (key: TranslationKey) => {
            const [namespace, name] = key.split('.') as ['polls', string];
            return messages[locale][namespace][name as never];
        };

        expect(formatVoteCount(count, locale, t)).toBe(expected);
    });
});
