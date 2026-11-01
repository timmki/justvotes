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

function fill(identity: string, password: string, repeat = password) {
    fireEvent.change(screen.getByLabelText('Anzeigename'), {target: {value: identity}});
    fireEvent.change(screen.getByLabelText('Neues Passwort'), {target: {value: password}});
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), {target: {value: repeat}});
    fireEvent.click(screen.getByRole('button', {name: 'Konto anlegen'}));
}

describe('InvitationPage', () => {
    it('keeps the button usable and reports empty passwords at the field (spec 009)', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        const accept = vi.spyOn(apiClient, 'acceptInvitation');
        renderPollTest('/invitation', <InvitationPage/>);
        await screen.findByText('anna@example.test');
        fireEvent.change(screen.getByLabelText('Anzeigename'), {target: {value: 'Anna'}});
        const button = screen.getByRole('button', {name: 'Konto anlegen'});
        expect(button).toBeEnabled();

        fireEvent.click(button);

        expect(accept).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Neues Passwort')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Neues Passwort wiederholen')).toHaveAttribute('aria-invalid', 'true');
        await vi.waitFor(() => expect(screen.getByLabelText('Neues Passwort')).toHaveFocus());
    });

    it('moves the token out of the address bar and completes the account', async () => {
        signIn(null);
        const inspect = vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        const accept = vi.spyOn(apiClient, 'acceptInvitation').mockResolvedValue(userSession('Anna'));
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByText('anna@example.test')).toBeVisible();
        expect(window.location.hash).toBe('');
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBe('secret-token');
        expect(inspect).toHaveBeenCalledWith('secret-token');

        fill('Anna', 'correct-horse-battery');

        await vi.waitFor(() => expect(accept).toHaveBeenCalledWith({
            token: 'secret-token', userID: 'Anna', password: 'correct-horse-battery',
        }));
        await vi.waitFor(() => expect(queryClient.getQueryData(queryKeys.session)).toEqual(userSession('Anna')));
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBeNull();
    });

    it('validates passwords locally and reports taken display names at the field', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        const accept = vi.spyOn(apiClient, 'acceptInvitation').mockRejectedValue(problemError({code: 'identity-taken'}, 409));
        renderPollTest('/invitation', <InvitationPage/>);
        await screen.findByText('anna@example.test');

        fill('Anna', 'short');
        expect(screen.getByRole('alert')).toHaveTextContent('mindestens 12 Zeichen');
        fill('Anna', 'correct-horse-battery', 'other-horse-battery');
        expect(screen.getByRole('alert')).toHaveTextContent('Die Passwörter stimmen nicht überein.');
        expect(accept).not.toHaveBeenCalled();

        fill('Anna', 'correct-horse-battery');
        expect(await screen.findByText('Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen.')).toBeVisible();
        expect(screen.getByLabelText('Anzeigename')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Anzeigename')).toHaveFocus();
        expect(window.sessionStorage.getItem(INVITATION_TOKEN_KEY)).toBe('secret-token');
    });

    it('shows the invited email address as the read-only sign-in name', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByLabelText('E-Mail-Adresse')).toHaveValue('anna@example.test');
        expect(screen.getByLabelText('E-Mail-Adresse')).toHaveAttribute('readonly');
        expect(screen.queryByLabelText('Kontoname')).toBeNull();
        expect(screen.getByText(/nicht deine E-Mail-Adresse/)).toBeVisible();
    });

    it('maps server-side input rules to the affected field', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue(preview);
        vi.spyOn(apiClient, 'acceptInvitation').mockRejectedValue(
            problemError({code: 'invalid-account-input', field: 'userID', rule: 'length'}, 400));
        renderPollTest('/invitation', <InvitationPage/>);
        await screen.findByText('anna@example.test');

        fill('Anna', 'correct-horse-battery');
        expect(await screen.findByText('Der Anzeigename muss 1 bis 64 Zeichen lang sein.')).toBeVisible();
        expect(screen.getByLabelText('Anzeigename')).toHaveAttribute('aria-invalid', 'true');
    });

    it('prefills the display name suggested by a contact import and lets the person change it', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'inspectInvitation').mockResolvedValue({...preview, suggestedUserID: 'Anna Beispiel'});
        const accept = vi.spyOn(apiClient, 'acceptInvitation').mockResolvedValue(userSession('Anna B.'));
        renderPollTest('/invitation', <InvitationPage/>);

        expect(await screen.findByLabelText('Anzeigename')).toHaveValue('Anna Beispiel');
        fireEvent.change(screen.getByLabelText('Anzeigename'), {target: {value: ''}});
        expect(screen.getByLabelText('Anzeigename')).toHaveValue('');
        fill('Anna B.', 'correct-horse-battery');

        await vi.waitFor(() => expect(accept).toHaveBeenCalledWith({
            token: 'secret-token', userID: 'Anna B.', password: 'correct-horse-battery',
        }));
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

        expect(await screen.findByText(/Du bist als bob@example.test angemeldet/)).toBeVisible();
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
