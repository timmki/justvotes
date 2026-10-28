import '@testing-library/jest-dom/vitest';
import {fireEvent, screen} from '@testing-library/react';
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
    fireEvent.change(screen.getByLabelText('Kontoname'), {target: {value: name}});
    fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: password}});
    fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));
}

describe('LoginPage', () => {
    it('stores the signed-in session for the application gate', async () => {
        const login = vi.spyOn(apiClient, 'login').mockResolvedValue(userSession('alice'));
        renderPollTest('/login', <LoginPage/>);

        submit('alice', 'correct-horse-battery');

        await vi.waitFor(() => expect(queryClient.getQueryData(queryKeys.session)).toEqual(userSession('alice')));
        expect(login).toHaveBeenCalledWith({username: 'alice', password: 'correct-horse-battery'});
    });

    it('shows one uniform message for wrong credentials, clears the password and focuses the name', async () => {
        vi.spyOn(apiClient, 'login').mockRejectedValue(problemError({code: 'invalid-credentials'}, 401));
        renderPollTest('/login', <LoginPage/>);

        submit('alice', 'wrong');

        expect(await screen.findByRole('alert')).toHaveTextContent('Kontoname oder Passwort ist falsch.');
        expect(screen.getByLabelText('Passwort')).toHaveValue('');
        expect(screen.getByLabelText('Kontoname')).toHaveFocus();
        expect(screen.getByLabelText('Kontoname')).toHaveAttribute('aria-invalid', 'true');
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

    it('keeps submit disabled until both fields are filled', () => {
        renderPollTest('/login', <LoginPage/>);
        expect(screen.getByRole('button', {name: 'Anmelden'})).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Kontoname'), {target: {value: 'alice'}});
        expect(screen.getByRole('button', {name: 'Anmelden'})).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: 'x'}});
        expect(screen.getByRole('button', {name: 'Anmelden'})).toBeEnabled();
    });
});
