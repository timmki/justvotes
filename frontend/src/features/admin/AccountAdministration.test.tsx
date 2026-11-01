import '@testing-library/jest-dom/vitest';
import {fireEvent, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {renderPollTest, usePollTestLifecycle} from '../polls/pollTestSupport';
import {AccountAdministration, type AccountSummary} from './AccountAdministration';
import {InvitationAdministration, type InvitationSummary} from './InvitationAdministration';

usePollTestLifecycle();

const admin: AccountSummary = {
    accountId: 'a_v1_1', email: 'systemadmin@example.test', role: 'admin', identity: null,
    status: 'active', passwordChangeRequired: false, createdAt: '2026-10-27T10:00:00Z',
};
const anna: AccountSummary = {
    accountId: 'a_v1_2', email: 'anna@example.test', role: 'user', identity: 'Anna',
    status: 'active', passwordChangeRequired: false, createdAt: '2026-10-27T11:00:00Z',
};

describe('AccountAdministration', () => {
    it('lists accounts and offers actions only for user accounts', async () => {
        vi.spyOn(apiClient, 'getAccounts').mockResolvedValue([admin, anna]);
        renderPollTest('/admin/accounts', <AccountAdministration/>);

        const rows = await screen.findAllByRole('row');
        expect(rows).toHaveLength(3);
        expect(within(rows[1]).getByText('Administrator')).toBeVisible();
        expect(within(rows[1]).queryByRole('button')).toBeNull();
        expect(within(rows[2]).getByText('anna@example.test')).toBeVisible();
        expect(within(rows[2]).getByRole('button', {name: 'Sperren'})).toBeVisible();
        expect(within(rows[2]).getByRole('button', {name: 'Einmalpasswort setzen'})).toBeVisible();
    });

    it('locks after confirmation and shows the new status', async () => {
        const getAccounts = vi.spyOn(apiClient, 'getAccounts').mockResolvedValue([admin, anna]);
        const lock = vi.spyOn(apiClient, 'lockAccount').mockImplementation(async () => {
            getAccounts.mockResolvedValue([admin, {...anna, status: 'locked'}]);
            return {...anna, status: 'locked'};
        });
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderPollTest('/admin/accounts', <AccountAdministration/>);

        fireEvent.click(await screen.findByRole('button', {name: 'Sperren'}));

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('anna'));
        expect(await screen.findByRole('button', {name: 'Entsperren'})).toBeVisible();
        expect(lock).toHaveBeenCalledWith('a_v1_2');
        expect(screen.getByText('Gesperrt')).toBeVisible();
    });

    it('does nothing when the confirmation is cancelled', async () => {
        vi.spyOn(apiClient, 'getAccounts').mockResolvedValue([admin, anna]);
        const lock = vi.spyOn(apiClient, 'lockAccount');
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderPollTest('/admin/accounts', <AccountAdministration/>);

        fireEvent.click(await screen.findByRole('button', {name: 'Sperren'}));

        expect(lock).not.toHaveBeenCalled();
    });

    it('shows a one-time password once', async () => {
        vi.spyOn(apiClient, 'getAccounts').mockResolvedValue([admin, anna]);
        vi.spyOn(apiClient, 'assignOneTimePassword').mockResolvedValue({password: 'Ab3dEf6hJk8mNp2q'});
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderPollTest('/admin/accounts', <AccountAdministration/>);

        fireEvent.click(await screen.findByRole('button', {name: 'Einmalpasswort setzen'}));

        const notice = await screen.findByRole('alert');
        expect(within(notice).getByText('Ab3dEf6hJk8mNp2q')).toBeVisible();
        expect(notice).toHaveTextContent('anna');
        fireEvent.click(within(notice).getByRole('button', {name: 'Schließen'}));
        expect(screen.queryByText('Ab3dEf6hJk8mNp2q')).toBeNull();
    });
});

describe('InvitationAdministration', () => {
    const open: InvitationSummary = {
        invitationId: 'i_v1_1', email: 'bert@example.test', status: 'open', deliveryFailed: true,
        issuedAt: '2026-10-27T10:00:00Z', expiresAt: '2026-11-03T10:00:00Z',
    };
    const accepted: InvitationSummary = {...open, invitationId: 'i_v1_2', email: 'anna@example.test', status: 'accepted', deliveryFailed: false};

    it('lists invitations with status and delivery failures', async () => {
        vi.spyOn(apiClient, 'getInvitations').mockResolvedValue([open, accepted]);
        renderPollTest('/admin/invitations', <InvitationAdministration/>);

        const rows = await screen.findAllByRole('row');
        expect(within(rows[1]).getByText('Offen')).toBeVisible();
        expect(within(rows[1]).getByText('Versand fehlgeschlagen')).toBeVisible();
        expect(within(rows[1]).getByRole('button', {name: 'Erneut senden'})).toBeVisible();
        expect(within(rows[2]).getByText('Angenommen')).toBeVisible();
        expect(within(rows[2]).queryByRole('button')).toBeNull();
    });

    it('invites by email and language and reports duplicates', async () => {
        vi.spyOn(apiClient, 'getInvitations').mockResolvedValue([]);
        const create = vi.spyOn(apiClient, 'createInvitation')
            .mockResolvedValueOnce({...open, email: 'carla@example.test', deliveryFailed: false})
            .mockRejectedValueOnce(problemError({code: 'email-already-invited'}, 409));
        renderPollTest('/admin/invitations', <InvitationAdministration/>);

        fireEvent.change(await screen.findByLabelText('E-Mail-Adresse'), {target: {value: ' carla@example.test '}});
        fireEvent.change(screen.getByLabelText('Sprache der Einladung'), {target: {value: 'en'}});
        fireEvent.click(screen.getByRole('button', {name: 'Einladen'}));

        expect(await screen.findByText('Einladung an carla@example.test versendet.')).toBeVisible();
        expect(create).toHaveBeenCalledWith({email: 'carla@example.test', locale: 'en'});

        fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {target: {value: 'carla@example.test'}});
        fireEvent.click(screen.getByRole('button', {name: 'Einladen'}));
        expect(await screen.findByText(/bereits ein Konto oder eine offene Einladung/)).toBeVisible();
    });

    it('revokes only after confirmation', async () => {
        vi.spyOn(apiClient, 'getInvitations').mockResolvedValue([open]);
        const revoke = vi.spyOn(apiClient, 'revokeInvitation').mockResolvedValue(undefined);
        vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
        renderPollTest('/admin/invitations', <InvitationAdministration/>);

        fireEvent.click(await screen.findByRole('button', {name: 'Widerrufen'}));
        expect(revoke).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Widerrufen'}));
        await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('i_v1_1'));
    });
});
