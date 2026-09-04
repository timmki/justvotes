import '@testing-library/jest-dom/vitest';
import {QueryClientProvider} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {networkError, problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {I18nProvider} from '../../shared/i18n/I18nProvider';
import {HomePage} from './HomePage';

beforeEach(() => {
    queryClient.clear();
    vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: null});
    vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([]);
});
afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
});

function renderHome() {
    return render(<MemoryRouter><QueryClientProvider
        client={queryClient}><I18nProvider><HomePage/></I18nProvider></QueryClientProvider></MemoryRouter>);
}

const discoveryPolls = [
    {
        id: 'z-active-newest',
        title: 'Newest active poll',
        visibility: 'public' as const,
        state: 'active' as const,
        createdAt: '2026-08-04T10:00:00Z',
        endsAt: null,
        totalVotes: 3,
        templateGroup: {id: 'group-1', name: 'Group', description: ''},
        templateSnapshotOptions: [],
        options: [],
    },
    {
        id: 'a-active-same-time',
        title: 'Same time active poll',
        visibility: 'public' as const,
        state: 'active' as const,
        createdAt: '2026-08-04T10:00:00Z',
        endsAt: null,
        totalVotes: 2,
        templateGroup: {id: 'group-1', name: 'Group', description: ''},
        templateSnapshotOptions: [],
        options: [],
    },
    {
        id: 'expired-newest',
        title: 'Newest expired poll',
        visibility: 'public' as const,
        state: 'expired' as const,
        createdAt: '2026-08-05T10:00:00Z',
        endsAt: null,
        totalVotes: 5,
        templateGroup: {id: 'group-1', name: 'Group', description: ''},
        templateSnapshotOptions: [],
        options: [],
    },
];

describe('HomePage identity', () => {
    it('shows the first eight characters while keeping the complete identity accessible', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'abcdefghijk'});

        renderHome();

        expect(await screen.findByText('abcdefgh…')).toBeTruthy();
        expect(screen.getByLabelText('abcdefghijk')).toBeTruthy();
    });

    it('supports first assignment, confirmation, and refetches the normalized server value', async () => {
        const getIdentity = vi.spyOn(apiClient, 'getIdentity')
            .mockResolvedValueOnce({userID: null})
            .mockResolvedValueOnce({userID: 'alice_1'});
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity').mockResolvedValue(undefined);
        const getPublicPolls = vi.mocked(apiClient.getPublicPolls);
        const withdrawVote = vi.spyOn(apiClient, 'withdrawVote');
        queryClient.setQueryData(queryKeys.publicPolls, []);
        queryClient.setQueryData(queryKeys.pollResults('poll-1'), {});

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität bearbeiten'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: ' Alice_1 '}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(changeIdentity).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Änderung bestätigen'}));

        await waitFor(() => expect(changeIdentity).toHaveBeenCalledWith({userID: 'alice_1'}));
        expect(withdrawVote).not.toHaveBeenCalled();
        expect(await screen.findByTitle('alice_1')).toBeTruthy();
        expect(getIdentity).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(getPublicPolls).toHaveBeenCalledTimes(2));
        expect(queryClient.getQueryState(queryKeys.pollResults('poll-1'))?.isInvalidated).toBe(true);
    });

    it('treats a differently formatted equivalent identity as a no-op', async () => {
        const getIdentity = vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity').mockResolvedValue(undefined);

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität bearbeiten'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: ' Alice '}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(changeIdentity).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(getIdentity).toHaveBeenCalledTimes(1);
    });

    it('cancels editing without changing the confirmed identity', async () => {
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity');
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität bearbeiten'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: 'bob'}});
        fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));

        expect(screen.getByTitle('alice')).toBeTruthy();
        expect(screen.queryByLabelText('Neue Identität')).toBeNull();
        expect(changeIdentity).not.toHaveBeenCalled();
    });

    it('keeps confirmation keyboard focus inside the modal and restores it on cancel', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität bearbeiten'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: 'bob'}});
        const saveButton = screen.getByRole('button', {name: 'Speichern'});
        fireEvent.click(saveButton);
        const confirmButton = screen.getByRole('button', {name: 'Änderung bestätigen'});

        expect(confirmButton).toHaveFocus();
        fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
        expect(within(screen.getByRole('dialog')).getByRole('button', {name: 'Abbrechen'})).toHaveFocus();
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(saveButton).toHaveFocus();
    });

    it.each([
        ['a server error', problemError({
            status: 400,
            code: 'identity_invalid',
            detail: 'Invalid identity.'
        }, 400), 'Die Anfrage konnte nicht verarbeitet werden.'],
        ['a CSRF error', problemError({
            status: 403,
            code: 'csrf_invalid',
            detail: 'Invalid CSRF.'
        }, 403), 'Diese Aktion ist nicht erlaubt.'],
        ['a network error', networkError(new Error('offline')), 'Netzwerkfehler. Prüfe deine Verbindung.'],
    ])('keeps edit state and confirmed identity visible after %s', async (_description, error, message) => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        vi.spyOn(apiClient, 'changeIdentity').mockRejectedValue(error);

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität bearbeiten'}));
        const input = screen.getByLabelText('Neue Identität');
        fireEvent.change(input, {target: {value: 'ab'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(screen.getByRole('alert')).toHaveTextContent('Die Identität muss 3 bis 32 Zeichen enthalten');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(input).toHaveValue('ab');

        fireEvent.change(input, {target: {value: 'bob'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        fireEvent.click(screen.getByRole('button', {name: 'Änderung bestätigen'}));

        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(input).toHaveValue('bob');
        expect(screen.getByTitle('alice')).toBeTruthy();
        expect(screen.getByRole('button', {name: 'Speichern'})).toHaveFocus();
    });
});

describe('HomePage discovery', () => {
    it('uses one public list for deterministic hero, honest metrics, and newest preview cards', async () => {
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue(discoveryPolls);
        const getPoll = vi.spyOn(apiClient, 'getPoll');
        const getPollResults = vi.spyOn(apiClient, 'getPollResults');

        renderHome();

        const featuredSection = await screen.findByRole('region', {name: 'Im Fokus'});
        const featuredCard = await within(featuredSection).findByRole('link', {name: /Same time active poll/});
        expect(featuredCard).toHaveClass('featured-poll-card');
        expect(screen.getByRole('list', {name: 'Neueste öffentliche Polls'})).toHaveTextContent('Newest expired poll');
        expect(screen.getByRole('list', {name: 'Neueste öffentliche Polls'}).textContent)
            .toMatch(/Newest expired poll[\s\S]*Same time active poll[\s\S]*Newest active poll/);
        expect(screen.getByText('Aktive öffentliche Polls').parentElement).toHaveTextContent('2');
        expect(screen.getByText('Öffentliche Polls gesamt').parentElement).toHaveTextContent('3');
        expect(screen.getByText('Öffentliche Stimmen').parentElement).toHaveTextContent('10');
        expect(vi.mocked(apiClient.getPublicPolls)).toHaveBeenCalledTimes(1);
        expect(getPoll).not.toHaveBeenCalled();
        expect(getPollResults).not.toHaveBeenCalled();
    });

    it('shows an honest featured fallback when the public list has no active poll', async () => {
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue([discoveryPolls[2]]);

        renderHome();

        expect(await screen.findByText('Keine aktive Poll')).toBeVisible();
        expect(screen.getByText('Aktive öffentliche Polls').parentElement).toHaveTextContent('0');
        expect(screen.getByText('Öffentliche Polls gesamt').parentElement).toHaveTextContent('1');
        expect(screen.getByText('Öffentliche Stimmen').parentElement).toHaveTextContent('5');
    });
});
