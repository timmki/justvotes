import '@testing-library/jest-dom/vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {apiClient, sessionCoordinator} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {userSession} from '../../test/sessions';
import {renderPollTest, usePollTestLifecycle} from '../polls/pollTestSupport';
import {LoginPage} from './LoginPage';

usePollTestLifecycle();

function submit(name: string, password: string) {
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {target: {value: name}});
    fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: password}});
    fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));
}

describe('LoginPage', () => {
    it('stores the signed-in session for the application gate', async () => {
        const login = vi.spyOn(apiClient, 'login').mockResolvedValue(userSession('alice'));
        renderPollTest('/login', <LoginPage/>);

        submit(' alice@example.test ', 'correct-horse-battery');

        await vi.waitFor(() => expect(queryClient.getQueryData(queryKeys.session)).toEqual(userSession('alice')));
        expect(login).toHaveBeenCalledWith({email: 'alice@example.test', password: 'correct-horse-battery'});
    });

    it('shows one uniform message for wrong credentials, clears the password and focuses the email field', async () => {
        vi.spyOn(apiClient, 'login').mockRejectedValue(problemError({code: 'invalid-credentials'}, 401));
        renderPollTest('/login', <LoginPage/>);

        submit('alice', 'wrong');

        expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail-Adresse oder Passwort ist falsch.');
        expect(screen.getByLabelText('Passwort')).toHaveValue('');
        expect(screen.getByLabelText('E-Mail-Adresse')).toHaveFocus();
        expect(screen.getByLabelText('E-Mail-Adresse')).toHaveAttribute('aria-invalid', 'true');
    });

    it('tells the person how long to wait after too many attempts', async () => {
        vi.spyOn(apiClient, 'login').mockRejectedValue(problemError({code: 'login-throttled'}, 429, 42));
        renderPollTest('/login', <LoginPage/>);

        submit('alice', 'wrong');

        expect(await screen.findByRole('alert')).toHaveTextContent('Bitte in 42 Sekunden erneut versuchen.');
    });

    it('explains an expired session', () => {
        sessionCoordinator.requireLogin('/polls');
        renderPollTest('/login', <LoginPage/>);

        expect(screen.getByText('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.')).toBeVisible();
        sessionCoordinator.consumeReturnRoute();
    });

    it('keeps submit usable and reports missing fields at the field (spec 009)', async () => {
        const login = vi.spyOn(apiClient, 'login');
        renderPollTest('/login', <LoginPage/>);
        const button = screen.getByRole('button', {name: 'Anmelden'});
        expect(button).toBeEnabled();

        fireEvent.click(button);

        expect(login).not.toHaveBeenCalled();
        const email = screen.getByLabelText('E-Mail-Adresse');
        const password = screen.getByLabelText('Passwort');
        expect(email).toHaveAttribute('aria-invalid', 'true');
        expect(password).toHaveAttribute('aria-invalid', 'true');
        expect(email).toHaveAccessibleDescription('Bitte fülle dieses Feld aus.');
        await waitFor(() => expect(email).toHaveFocus());

        fireEvent.change(email, {target: {value: 'alice@example.test'}});
        fireEvent.click(button);
        expect(email).not.toHaveAttribute('aria-invalid', 'true');
        expect(password).toHaveAttribute('aria-invalid', 'true');
        await waitFor(() => expect(password).toHaveFocus());
        expect(login).not.toHaveBeenCalled();
    });
});
