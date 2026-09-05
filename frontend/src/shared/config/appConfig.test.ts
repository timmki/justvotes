import {afterEach, describe, expect, it, vi} from 'vitest';
import {getAppName} from './appConfig';

afterEach(() => vi.unstubAllEnvs());

describe('app configuration', () => {
    it('uses JustVotes when no app name is configured', () => {
        vi.stubEnv('VITE_APP_NAME', '');

        expect(getAppName()).toBe('JustVotes');
    });

    it('uses the trimmed configured app name', () => {
        vi.stubEnv('VITE_APP_NAME', '  PollBoard  ');

        expect(getAppName()).toBe('PollBoard');
    });
});
