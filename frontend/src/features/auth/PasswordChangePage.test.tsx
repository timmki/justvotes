import '@testing-library/jest-dom/vitest';
import {fireEvent, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {ToastProvider} from '../../shared/ui/ToastProvider';
import {signIn, userSession} from '../../test/sessions';
import {renderPollTest, usePollTestLifecycle} from '../polls/pollTestSupport';
import {PasswordChangePage} from './PasswordChangePage';

usePollTestLifecycle();

function fill(current: string, next: string, repeat = next) {
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), {target: {value: current}});
    fireEvent.change(screen.getByLabelText('Neues Passwort'), {target: {value: next}});
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), {target: {value: repeat}});
    fireEvent.click(screen.getByRole('button', {name: 'Passwort speichern'}));
}

function renderPage() {
    return renderPollTest('/password', <ToastProvider><PasswordChangePage/></ToastProvider>);
}

describe('PasswordChangePage', () => {
    it('changes the password and confirms it', async () => {
        signIn(userSession('alice'));
        const change = vi.spyOn(apiClient, 'changePassword').mockResolvedValue(undefined);
        renderPage();

        fill('old-password-123', 'a-brand-new-password');

        await vi.waitFor(() => expect(change).toHaveBeenCalledWith({currentPassword: 'old-password-123', newPassword: 'a-brand-new-password'}));
        expect(await screen.findByText('Passwort geändert.')).toBeVisible();
    });

    it('checks length and repetition before contacting the server', () => {
        signIn(userSession('alice'));
        const change = vi.spyOn(apiClient, 'changePassword');
        renderPage();

        fill('old-password-123', 'short');
        expect(screen.getByRole('alert')).toHaveTextContent('mindestens 12 Zeichen');
        fill('old-password-123', 'a-brand-new-password', 'a-different-password');
        expect(screen.getByRole('alert')).toHaveTextContent('Die Passwörter stimmen nicht überein.');
        expect(change).not.toHaveBeenCalled();
        expect(screen.getByText('Mindestens 12 und höchstens 128 Zeichen.')).toBeVisible();
    });

    it('reports a wrong current password', async () => {
        signIn(userSession('alice'));
        vi.spyOn(apiClient, 'changePassword').mockRejectedValue(problemError({code: 'current-password-invalid'}, 422));
        renderPage();

        fill('wrong-password-1', 'a-brand-new-password');

        expect(await screen.findByText('Das aktuelle Passwort ist falsch.')).toBeVisible();
    });

    it('explains a required change after a one-time password', () => {
        signIn(userSession('alice', {passwordChangeRequired: true}));
        renderPage();

        expect(screen.getByText(/Einmalpasswort erhalten/)).toBeVisible();
    });
});
