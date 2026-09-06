import {afterEach, describe, expect, it, vi} from 'vitest';
import {getAppInitials, getAppName} from './appConfig';

afterEach(() => {
    delete window.__JUSTVOTES_CONFIG__;
    vi.unstubAllEnvs();
});

describe('app configuration', () => {
    it('uses JustVotes when no app name is configured', () => {
        vi.stubEnv('VITE_APP_NAME', '');

        expect(getAppName()).toBe('JustVotes');
    });

    it('uses the trimmed configured app name', () => {
        vi.stubEnv('VITE_APP_NAME', '  PollBoard  ');

        expect(getAppName()).toBe('PollBoard');
    });

    it('prefers the trimmed runtime app name over the build-time name', () => {
        vi.stubEnv('VITE_APP_NAME', 'Build App');
        window.__JUSTVOTES_CONFIG__ = {appName: '  Runtime App  '};

        expect(getAppName()).toBe('Runtime App');
    });

    it('falls back to the build-time name when the runtime name is blank', () => {
        vi.stubEnv('VITE_APP_NAME', 'Build App');
        window.__JUSTVOTES_CONFIG__ = {appName: '  '};

        expect(getAppName()).toBe('Build App');
    });

    it('derives uppercase initials from every app name word', () => {
        expect(getAppInitials('Foo App')).toBe('FA');
        expect(getAppInitials('JustVotes')).toBe('J');
    });
});
