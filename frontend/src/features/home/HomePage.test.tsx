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
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'Älice #42'});

        renderHome();

        expect(await screen.findByText('Älice #4…')).toBeTruthy();
        expect(screen.getByLabelText('Älice #42')).toBeTruthy();
    });

    it('supports first assignment, confirmation, and refetches the exact server value', async () => {
        const getIdentity = vi.spyOn(apiClient, 'getIdentity')
            .mockResolvedValueOnce({userID: null})
            .mockResolvedValueOnce({userID: 'Älice #1'});
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity').mockResolvedValue(undefined);
        const getPublicPolls = vi.mocked(apiClient.getPublicPolls);
        const withdrawVote = vi.spyOn(apiClient, 'withdrawVote');
        queryClient.setQueryData(queryKeys.publicPolls, []);
        queryClient.setQueryData(queryKeys.pollResults('poll-1'), {});

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität festlegen'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: 'Älice #1'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByRole('heading', {name: 'Identität festlegen?'})).toBeVisible();
        expect(changeIdentity).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Festlegen'}));

        await waitFor(() => expect(changeIdentity).toHaveBeenCalledWith({userID: 'Älice #1'}));
        expect(withdrawVote).not.toHaveBeenCalled();
        expect(await screen.findByTitle('Älice #1')).toBeTruthy();
        expect(getIdentity).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(getPublicPolls).toHaveBeenCalledTimes(2));
        expect(queryClient.getQueryState(queryKeys.pollResults('poll-1'))?.isInvalidated).toBe(true);
    });

    it('treats the exact same identity as a no-op', async () => {
        const getIdentity = vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity').mockResolvedValue(undefined);

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität ändern'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: 'alice'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(changeIdentity).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(getIdentity).toHaveBeenCalledTimes(1);
    });

    it('cancels editing without changing the confirmed identity', async () => {
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity');
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität ändern'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: 'bob'}});
        fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));

        expect(screen.getByTitle('alice')).toBeTruthy();
        expect(screen.queryByLabelText('Neue Identität')).toBeNull();
        expect(changeIdentity).not.toHaveBeenCalled();
    });

    it('keeps confirmation keyboard focus inside the modal and restores it on cancel', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderHome();
        fireEvent.click(await screen.findByRole('button', {name: 'Identität ändern'}));
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
        fireEvent.click(await screen.findByRole('button', {name: 'Identität ändern'}));
        const input = screen.getByLabelText('Neue Identität');
        fireEvent.change(input, {target: {value: ''}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(screen.getByRole('alert')).toHaveTextContent('Die Identität muss 1 bis 64 Zeichen enthalten');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(input).toHaveValue('');

        fireEvent.change(input, {target: {value: 'Älice #1'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        fireEvent.click(screen.getByRole('button', {name: 'Änderung bestätigen'}));

        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(input).toHaveValue('Älice #1');
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
        const latestList = screen.getByRole('list', {name: 'Neueste öffentliche Abstimmungen'});
        expect(latestList).toHaveTextContent('Newest expired poll');
        expect(latestList.textContent).toMatch(/Newest expired poll[\s\S]*Newest active poll/);
        expect(within(latestList).queryByRole('link', {name: /Same time active poll/})).toBeNull();
        expect(screen.getByText('Aktive öffentliche Abstimmungen').parentElement).toHaveTextContent('2');
        expect(screen.getByText('Öffentliche Abstimmungen gesamt').parentElement).toHaveTextContent('3');
        expect(screen.getByText('Öffentliche Stimmen').parentElement).toHaveTextContent('10');
        expect(vi.mocked(apiClient.getPublicPolls)).toHaveBeenCalledTimes(1);
        expect(getPoll).not.toHaveBeenCalled();
        expect(getPollResults).not.toHaveBeenCalled();
    });

    it('shows an honest featured fallback when the public list has no active poll', async () => {
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue([discoveryPolls[2]]);

        renderHome();

        expect(await screen.findByText('Keine aktive Abstimmung')).toBeVisible();
        expect(screen.getByText('Aktive öffentliche Abstimmungen').parentElement).toHaveTextContent('0');
        expect(screen.getByText('Öffentliche Abstimmungen gesamt').parentElement).toHaveTextContent('1');
        expect(screen.getByText('Öffentliche Stimmen').parentElement).toHaveTextContent('5');
    });
});

describe('HomePage identity and hierarchy', () => {
    it('shows the identity call to action before the featured poll while no identity is set', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: null});
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue(discoveryPolls);

        renderHome();

        const action = await screen.findByRole('button', {name: 'Identität festlegen'});
        expect(action).toHaveClass('primary-button');
        const featured = await screen.findByRole('region', {name: 'Im Fokus'});
        expect(action.compareDocumentPosition(featured) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('keeps the start page heading visually hidden and shows no full identity card once identity is set', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue(discoveryPolls);

        renderHome();

        expect(await screen.findByRole('region', {name: 'Im Fokus'})).toBeVisible();
        expect(screen.getByRole('heading', {level: 1})).toHaveClass('sr-only');
        expect(screen.queryByRole('button', {name: 'Identität festlegen'})).toBeNull();
    });

    it('hides the latest section when the featured poll is the only public poll', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue([discoveryPolls[1]]);

        renderHome();

        expect(await screen.findByRole('region', {name: 'Im Fokus'})).toBeVisible();
        expect(screen.queryByRole('list', {name: 'Neueste öffentliche Abstimmungen'})).toBeNull();
    });
});

describe('HomePage intro and card names', () => {
    it('keeps the start heading for assistive technology while the visible intro takes no layout space', async () => {
        renderHome();

        expect(await screen.findByRole('heading', {name: 'Startseite', level: 1})).toBeInTheDocument();
        expect(document.querySelector('.page-intro')).toHaveClass('sr-only');
    });

    it('gives a card with a long title its full title as accessible name', async () => {
        const longTitle = 'Ein sehr langer Abstimmungstitel mit vielen Wörtern für die Kartenbeschriftung'.repeat(2);
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue([{...discoveryPolls[0], id: 'long-title-poll', title: longTitle}]);
        renderHome();

        expect(await screen.findByRole('link', {name: new RegExp(longTitle)})).toBeInTheDocument();
    });
});
