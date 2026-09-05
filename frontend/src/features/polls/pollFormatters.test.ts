import {describe, expect, it} from 'vitest';
import {formatTimestamp} from './pollFormatters';

describe('poll formatters', () => {
    it('formats the same timestamp using the requested locale', () => {
        const timestamp = '2026-08-01T10:00:00Z';

        expect(formatTimestamp(timestamp, 'de')).toContain('01.08.2026');
        expect(formatTimestamp(timestamp, 'en')).toContain('Aug 1, 2026');
    });
});
