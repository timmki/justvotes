import {vi} from 'vitest';
import {apiClient, type CurrentSession} from '../shared/api/client';
import {queryClient} from '../shared/api/queryClient';
import {queryKeys} from '../shared/api/queryKeys';

export function userSession(identity = 'alice', overrides: Partial<CurrentSession> = {}): CurrentSession {
    return {email: `${identity.toLowerCase().replace(/[^a-z0-9]/g, '-')}@example.test`, role: 'user', identity, passwordChangeRequired: false, ...overrides};
}

export function adminSession(overrides: Partial<CurrentSession> = {}): CurrentSession {
    return {email: 'systemadmin@example.test', role: 'admin', identity: null, passwordChangeRequired: false, ...overrides};
}

/**
 * Makes the application believe the given account is signed in (or nobody, for null).
 */
export function mockSession(session: CurrentSession | null) {
    return vi.spyOn(apiClient, 'getSession').mockResolvedValue(session);
}

/**
 * Signs the account in synchronously for the first render and keeps later session probes consistent.
 */
export function signIn(session: CurrentSession | null) {
    queryClient.setQueryData(queryKeys.session, session);
    return mockSession(session);
}
