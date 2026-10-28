import '@testing-library/jest-dom/vitest';
import {fireEvent, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {signIn, userSession} from '../../test/sessions';
import {renderPollTest, usePollTestLifecycle} from '../polls/pollTestSupport';
import {INVITATION_TOKEN_KEY, InvitationPage} from './InvitationPage';

usePollTestLifecycle();

const preview = {email: 'anna@example.test', expiresAt: '2026-11-03T10:00:00Z'};

beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/invitation#token=secret-token');
});

afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
});

function fill(name: string, identity: string, password: string, repeat = password) {
    fireEvent.change(screen.getByLabelText('Kontoname'), {target: {value: name}});
    fireEvent.change(screen.getByLabelText('Identität'), {target: {value: identity}});
    fireEvent.change(screen.getByLabelText('Neues Passwort'), {target: {value: password}});
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), {target: {value: repeat}});
    fireEvent.click(screen.getByRole('button', {name: 'Konto anlegen'}));
}

describe('InvitationPage', () => {
    it('moves the token out of the address bar and completes the account', async () => {
        signIn(null);
        const inspect = vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        const accept = vi.spyOn(apiClient, 'acceptInvitation').mockResolvedValue(userSession('Anna'));
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByText('anna@example.test')).toBeVisible();
        expect(window.location.hash).toBe('');
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBe('secret-token');
        expect(inspect).toHaveBeenCalledWith('secret-token');

        fill('anna', 'Anna', 'correct-horse-battery');

        await vi.waitFor(() => expect(accept).toHaveBeenCalledWith({
            token: 'secret-token', username: 'anna', userID: 'Anna', password: 'correct-horse-battery',
        }));
        await vi.waitFor(() => expect(queryClient.getQueryData(queryKeys.session)).toEqual(userSession('Anna')));
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBeNull();
    });

    it('validates passwords locally and reports taken names from the server', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        const accept = vi.spyOn(apiClient, 'acceptInvitation').mockRejectedValue(problemError({code: 'account-name-taken'}, 409));
        renderPollTest('/invitation', <InvitationPage/>);
        await screen.findByText('anna@example.test');

        fill('anna', 'Anna', 'short');
        expect(screen.getByRole('alert')).toHaveTextContent('mindestens 12 Zeichen');
        fill('anna', 'Anna', 'correct-horse-battery', 'other-horse-battery');
        expect(screen.getByRole('alert')).toHaveTextContent('Die Passwörter stimmen nicht überein.');
        expect(accept).not.toHaveBeenCalled();

        fill('anna', 'Anna', 'correct-horse-battery');
        expect(await screen.findByText('Dieser Kontoname ist bereits vergeben.')).toBeVisible();
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBe('secret-token');
    });

    it('explains unusable invitations and forgets their token', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockRejectedValue(problemError({code: 'invitation-not-usable'}, 409));
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByText(/nicht mehr gültig/)).toBeVisible();
        expect(screen.getByRole('link', {name: 'Zur Anmeldung'})).toHaveAttribute('href', '/login');
        await vi.waitFor(() => expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBeNull());
    });

    it('asks a signed-in person to sign out first and keeps the token for afterwards', async () => {
        signIn(userSession('Bob'));
        const inspect = vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        const logout = vi.spyOn(apiClient, 'logout').mockImplementation(async () => {
            signIn(null);
        });
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByText(/Du bist als account-Bob angemeldet/)).toBeVisible();
        expect(inspect).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBe('secret-token');

        await vi.waitFor(() => expect(queryClient.isFetching()).toBe(0));
        fireEvent.click(screen.getByRole('button', {name: 'Abmelden'}));

        expect(await screen.findByText('anna@example.test')).toBeVisible();
        expect(logout).toHaveBeenCalledTimes(1);
        expect(inspect).toHaveBeenCalledWith('secret-token');
    });

    it('reports an incomplete link', async () => {
        signIn(null);
        window.history.replaceState(null, '', '/invitation');
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByText('Der Einladungslink ist unvollständig.')).toBeVisible();
    });
});
