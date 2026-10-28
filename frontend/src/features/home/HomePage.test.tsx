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
import {mockSession, userSession} from '../../test/sessions';

beforeEach(() => {
    queryClient.clear();
    mockSession(userSession('alice'));
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

describe('HomePage hierarchy', () => {
    it('keeps the start page heading visually hidden and shows no identity editor', async () => {
        mockSession(userSession('alice'));
        vi.mocked(apiClient.getPublicPolls).mockResolvedValue(discoveryPolls);

        renderHome();

        expect(await screen.findByRole('region', {name: 'Im Fokus'})).toBeVisible();
        expect(screen.getByRole('heading', {level: 1})).toHaveClass('sr-only');
        expect(screen.queryByRole('button', {name: 'Identität festlegen'})).toBeNull();
    });

    it('hides the latest section when the featured poll is the only public poll', async () => {
        mockSession(userSession('alice'));
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
