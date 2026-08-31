import '@testing-library/jest-dom/vitest';
import {QueryClientProvider} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {queryClient} from '../../shared/api/queryClient';
import {I18nProvider} from '../../shared/i18n/I18nProvider';
import {PollsPage} from './PollPages';

const polls = [
    {
        id: 'opaque-poll-id-123456789',
        title: 'Welcher Titel darf nicht aus dem Layout laufen?',
        visibility: 'public' as const,
        state: 'active' as const,
        createdAt: '2025-01-05T14:30:00Z',
        endsAt: null,
        totalVotes: 0,
        templateGroup: {id: 'group-1', name: 'Gruppe', description: 'Beschreibung'},
        templateSnapshotOptions: [],
        options: [],
    },
];

beforeEach(() => {
    queryClient.clear();
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            clear: () => values.clear(),
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => values.set(key, value),
        },
    });
});
afterEach(() => {
    cleanup();
    queryClient.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
});

function renderPolls(initialEntry = '/polls') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <QueryClientProvider client={queryClient}>
                <I18nProvider>
                    <Routes>
                        <Route path="/polls" element={<PollsPage/>}/>
                        <Route path="/poll/:pollId" element={<p>Poll detail</p>}/>
                    </Routes>
                </I18nProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
}

describe('PollsPage', () => {
    it('renders every card from one localized list response, including zero votes', async () => {
        const getPublicPolls = vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue(polls);
        const getPoll = vi.spyOn(apiClient, 'getPoll');

        renderPolls();

        const card = await screen.findByRole('link', {name: /Welcher Titel/});
        expect(card).toHaveAttribute('href', '/poll/opaque-poll-id-123456789');
        expect(card).toHaveTextContent('0');
        expect(card).toHaveTextContent('opaque-poll-id-123456789');
        expect(card).toHaveTextContent('Admin');
        expect(card).toHaveTextContent('05.01.2025');
        expect(getPublicPolls).toHaveBeenCalledTimes(1);
        expect(getPoll).not.toHaveBeenCalled();
    });

    it('navigates from the whole card with mouse activation', async () => {
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue(polls);

        renderPolls();

        const card = await screen.findByRole('link', {name: /Welcher Titel/});
        fireEvent.click(card);
        expect(screen.getByText('Poll detail')).toBeVisible();
    });

    it.each(['Enter', ' '])('navigates from the whole card with %s activation', async (key) => {
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue(polls);

        renderPolls();

        const card = await screen.findByRole('link', {name: /Welcher Titel/});
        fireEvent.keyDown(card, {key});
        if (key === ' ') fireEvent.keyUp(card, {key});
        expect(screen.getByText('Poll detail')).toBeVisible();
    });

    it('shows loading and empty states through the shared query presentation', async () => {
        vi.spyOn(apiClient, 'getPublicPolls').mockImplementation(() => new Promise(() => undefined));

        renderPolls();

        expect(screen.getByRole('status')).toHaveTextContent('Wird geladen');
        cleanup();
        queryClient.clear();
        vi.restoreAllMocks();
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([]);
        renderPolls();

        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();
    });

    it('offers retry after a failed list request', async () => {
        const getPublicPolls = vi.spyOn(apiClient, 'getPublicPolls')
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(polls);

        renderPolls();

        const retry = await screen.findByRole('button', {name: 'Erneut versuchen'});
        fireEvent.click(retry);

        expect(await screen.findByRole('link', {name: /Welcher Titel/})).toBeVisible();
        await waitFor(() => expect(getPublicPolls).toHaveBeenCalledTimes(2));
    });

    it('localizes creator and date metadata', async () => {
        window.localStorage.setItem('justvotes-locale', 'en');
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue(polls);

        renderPolls();

        const card = await screen.findByRole('link', {name: /Welcher Titel/});
        expect(card).toHaveTextContent('Created by Admin');
        expect(card).toHaveTextContent('Jan 5, 2025');
    });
});
