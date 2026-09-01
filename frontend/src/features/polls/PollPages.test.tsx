import '@testing-library/jest-dom/vitest';
import {QueryClientProvider} from '@tanstack/react-query';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {I18nProvider} from '../../shared/i18n/I18nProvider';
import {OptionPage, PollPage, PollsPage, ResultsPage} from './PollPages';

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

const poll = {
    id: 'poll-1',
    title: 'Team-Ausflug',
    visibility: 'public' as const,
    state: 'active' as const,
    createdAt: '2026-08-01T10:00:00Z',
    endsAt: '2099-01-01T00:00:00Z',
    totalVotes: 1,
    templateGroup: {id: 'group-1', name: 'Gruppe', description: 'Beschreibung'},
    templateSnapshotOptions: [{number: 2, text: 'Zebra'}, {number: 7, text: 'Apfel'}],
    options: [{number: 2, text: 'Zebra'}, {number: 7, text: 'Apfel'}],
};

function resultsFor(optionNumber: number | null) {
    return {
        id: poll.id,
        title: poll.title,
        visibility: poll.visibility,
        state: poll.state,
        createdAt: poll.createdAt,
        endsAt: poll.endsAt,
        totalVotes: optionNumber === null ? 0 : 1,
        options: poll.options.map((option) => ({
            ...option,
            voteCount: option.number === optionNumber ? 1 : 0,
            votes: option.number === optionNumber ? [{userID: 'alice', votedAt: '2026-08-01T10:01:00Z'}] : [],
        })),
    };
}

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

function renderPollPage() {
    return render(
        <MemoryRouter initialEntries={['/poll/poll-1']}>
            <QueryClientProvider client={queryClient}>
                <I18nProvider>
                    <Routes>
                        <Route path="/poll/:pollId" element={<PollPage/>}/>
                        <Route path="/poll/results/:pollId" element={<p>Results</p>}/>
                    </Routes>
                </I18nProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
}

function renderResultsPage(initialEntry = '/poll/results/poll-1') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <QueryClientProvider client={queryClient}>
                <I18nProvider>
                    <Routes>
                        <Route path="/poll/results/:pollId" element={<ResultsPage/>}/>
                        <Route path="/poll/results/:pollId/option/:optionNumber" element={<OptionPage/>}/>
                        <Route path="/poll/:pollId" element={<p>Poll detail</p>}/>
                    </Routes>
                </I18nProvider>
            </QueryClientProvider>
        </MemoryRouter>
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

describe('PollPage', () => {
    beforeEach(() => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue(poll);
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
    });

    it.each([
        ['created', null, 7, 'Stimme abgegeben'],
        ['replaced', 2, 7, 'Stimme geändert'],
        ['unchanged', 7, 7, 'Stimme unverändert'],
    ] as const)('handles a %s vote result and sends the stable option number', async (status, initialOption, targetOption, feedback) => {
        if (initialOption === null) {
            vi.spyOn(apiClient, 'getPollResults')
                .mockRejectedValueOnce(problemError({code: 'results-not-available'}, 403))
                .mockResolvedValue(resultsFor(targetOption));
        } else {
            vi.spyOn(apiClient, 'getPollResults')
                .mockResolvedValueOnce(resultsFor(initialOption))
                .mockResolvedValue(resultsFor(targetOption));
        }
        const castVote = vi.spyOn(apiClient, 'castVote').mockResolvedValue({status, optionNumber: targetOption});

        renderPollPage();

        const option = await screen.findByRole('radio', {name: 'Apfel'});
        expect(screen.getAllByRole('radio').map((input) => input.getAttribute('aria-label'))).toEqual(['Apfel', 'Zebra']);
        if (initialOption === 7) await waitFor(() => expect(option).toBeChecked());
        fireEvent.click(option);

        await waitFor(() => expect(castVote).toHaveBeenCalledWith(poll.id, targetOption));
        expect(await screen.findByText(new RegExp(feedback))).toBeVisible();
        expect(await screen.findByRole('link', {name: 'Poll-Ergebnisse'})).toHaveAttribute('href', `/poll/results/${poll.id}`);
    });

    it('sorts options alphabetically while rolling back a failed selection', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor(2));
        vi.spyOn(apiClient, 'castVote').mockRejectedValue(new Error('offline'));

        renderPollPage();

        const options = await screen.findAllByRole('radio');
        expect(options.map((input) => input.getAttribute('aria-label'))).toEqual(['Apfel', 'Zebra']);
        await waitFor(() => expect(screen.getByRole('radio', {name: 'Zebra'})).toBeChecked());
        fireEvent.click(screen.getByRole('radio', {name: 'Apfel'}));

        await waitFor(() => expect(screen.getByRole('radio', {name: 'Zebra'})).toBeChecked());
        expect(screen.getByRole('alert')).toHaveTextContent('Die Anfrage konnte nicht verarbeitet werden');
    });

    it('treats an active poll results 403 as not voted instead of a page error', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'results-not-available'}, 403));

        renderPollPage();

        expect(await screen.findByText('Ergebnisse werden nach der ersten Stimme freigegeben.')).toBeVisible();
        expect(screen.getByRole('heading', {name: 'Team-Ausflug', level: 3})).toBeVisible();
        expect(screen.queryByText('Daten konnten nicht geladen werden')).toBeNull();
        expect(screen.queryByRole('link', {name: 'Poll-Ergebnisse'})).toBeNull();
    });

    it('does not hide a non-results-forbidden error behind the not-voted state', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'forbidden'}, 403));

        renderPollPage();

        expect(await screen.findByRole('heading', {name: 'Diese Aktion ist nicht erlaubt.', level: 3})).toBeVisible();
        expect(screen.queryByText('Ergebnisse werden nach der ersten Stimme freigegeben.')).toBeNull();
    });

    it('hides stale results links while a released-results refetch is forbidden', async () => {
        let rejectRefetch: ((reason?: unknown) => void) | undefined;
        const getPollResults = vi.spyOn(apiClient, 'getPollResults')
            .mockResolvedValueOnce(resultsFor(7))
            .mockImplementationOnce(() => new Promise((_, reject) => {
                rejectRefetch = reject;
            }));

        renderPollPage();

        expect(await screen.findByRole('link', {name: 'Poll-Ergebnisse'})).toBeVisible();
        const invalidation = queryClient.invalidateQueries({queryKey: queryKeys.pollResults(poll.id)});
        await waitFor(() => expect(getPollResults).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole('link', {name: 'Poll-Ergebnisse'})).toBeNull();
        rejectRefetch?.(problemError({code: 'results-not-available'}, 403));
        await invalidation;

        expect(await screen.findByText('Ergebnisse werden nach der ersten Stimme freigegeben.')).toBeVisible();
        expect(screen.queryByRole('link', {name: 'Poll-Ergebnisse'})).toBeNull();
        expect(getPollResults).toHaveBeenCalledTimes(2);
    });

    it('disables voting for an expired poll but keeps released results available', async () => {
        const expiredPoll = {...poll, state: 'expired' as const};
        vi.mocked(apiClient.getPoll).mockResolvedValue(expiredPoll);
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: null});
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(null), state: 'expired' as const});

        renderPollPage();

        expect(await screen.findByText(/Dieser Poll ist nicht mehr aktiv.*abgelaufen/)).toBeVisible();
        expect(screen.getByRole('radio', {name: 'Apfel'})).toBeDisabled();
        expect(await screen.findByRole('link', {name: 'Poll-Ergebnisse'})).toBeVisible();
    });

    it('uses the safe 404 state for private poll data and never loads its results', async () => {
        const privatePoll = {...poll, visibility: 'private' as const};
        const getPollResults = vi.spyOn(apiClient, 'getPollResults');
        vi.mocked(apiClient.getPoll).mockResolvedValue(privatePoll);

        renderPollPage();

        expect(await screen.findByRole('heading', {name: 'Seite nicht gefunden', level: 3})).toBeVisible();
        expect(getPollResults).not.toHaveBeenCalled();
    });

    it('uses the safe 404 state for a missing poll', async () => {
        vi.mocked(apiClient.getPoll).mockRejectedValue(problemError({}, 404));

        renderPollPage();

        expect(await screen.findByRole('heading', {name: 'Seite nicht gefunden', level: 3})).toBeVisible();
        expect(screen.queryByRole('radio')).toBeNull();
    });
});

describe('ResultsPage', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows totals, zero-safe percentages, winners first, and current voters', async () => {
        const result = {
            ...resultsFor(null),
            totalVotes: 3,
            options: [
                {...poll.options[0], voteCount: 1, votes: [{userID: 'alice', votedAt: '2026-08-01T10:01:00Z'}]},
                {...poll.options[1], voteCount: 2, votes: [{userID: 'bob', votedAt: '2026-08-01T10:02:00Z'}, {userID: 'carol', votedAt: '2026-08-01T10:03:00Z'}]},
            ],
        };
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(result);
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderResultsPage();

        expect(await screen.findByRole('heading', {name: 'Team-Ausflug', level: 3})).toBeVisible();
        expect(screen.getByText('3')).toBeVisible();
        expect(screen.getByText('67 %')).toBeVisible();
        expect(screen.getByText('33 %')).toBeVisible();
        expect(screen.getByText('Gewinner')).toBeVisible();
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Apfel', 'Zebra', 'Polls', 'Audit Log']);

        const zeroResult = {...result, totalVotes: 0, options: result.options.map((option) => ({...option, voteCount: 0, votes: []}))};
        vi.mocked(apiClient.getPollResults).mockResolvedValue(zeroResult);
        await act(async () => {
            await queryClient.invalidateQueries({queryKey: queryKeys.pollResults(poll.id)});
        });
        await waitFor(() => expect(screen.getAllByText('0 %')).toHaveLength(2));
    });

    it('marks all tied positive options as winners and polls only while visible and active', async () => {
        vi.useFakeTimers();
        const result = {...resultsFor(null), totalVotes: 2, options: poll.options.map((option) => ({
            ...option,
            voteCount: 1,
            votes: [{userID: 'alice', votedAt: '2026-08-01T10:01:00Z'}],
        }))};
        const getPollResults = vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(result);
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderResultsPage();
        await act(async () => {
            await Promise.resolve();
        });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            vi.advanceTimersByTime(0);
            await Promise.resolve();
        });
        expect(screen.getAllByText('Gleichstand')).toHaveLength(2);

        await act(async () => {
            vi.advanceTimersByTime(4_999);
        });
        expect(getPollResults).toHaveBeenCalledTimes(1);
        await act(async () => {
            vi.advanceTimersByTime(1_001);
            await Promise.resolve();
        });
        expect(getPollResults).toHaveBeenCalledTimes(2);

        Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
            await Promise.resolve();
        });
        await act(async () => {
            vi.advanceTimersByTime(10_000);
        });
        expect(getPollResults).toHaveBeenCalledTimes(2);

        Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
            await Promise.resolve();
        });
        await act(async () => {
            vi.advanceTimersByTime(5_001);
            await Promise.resolve();
        });
        expect(getPollResults).toHaveBeenCalledTimes(3);
    });

    it('shows a direct option link with a running voter number and localized timestamp', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(7), options: [{
            ...poll.options[1],
            voteCount: 1,
            votes: [{userID: 'alice', votedAt: '2026-08-01T10:01:00Z'}],
        }]});

        renderResultsPage('/poll/results/poll-1/option/7');

        expect(await screen.findByRole('heading', {name: 'Apfel', level: 3})).toBeVisible();
        expect(screen.getByText('Team-Ausflug')).toBeVisible();
        expect(screen.getByText('1')).toBeVisible();
        expect(screen.getByText('alice')).toBeVisible();
        expect(screen.getByText(/01\.08\.2026/)).toBeVisible();
    });

    it('confirms withdrawal, invalidates affected views, and returns to the poll', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor(7));
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        const withdrawVote = vi.spyOn(apiClient, 'withdrawVote').mockResolvedValue(undefined);
        const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderResultsPage();

        await screen.findByRole('button', {name: 'Stimme zurücknehmen'});
        fireEvent.click(screen.getByRole('button', {name: 'Stimme zurücknehmen'}));

        await waitFor(() => expect(withdrawVote).toHaveBeenCalledWith(poll.id));
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.publicPolls});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.poll(poll.id)});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.pollResults(poll.id)});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.pollAudit(poll.id)});
        expect(await screen.findByText('Poll detail')).toBeVisible();
    });

    it('keeps the confirmed vote and shows an error when withdrawal fails', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor(7));
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        vi.spyOn(apiClient, 'withdrawVote').mockRejectedValue(new Error('offline'));
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderResultsPage();

        await screen.findByRole('button', {name: 'Stimme zurücknehmen'});
        fireEvent.click(screen.getByRole('button', {name: 'Stimme zurücknehmen'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Die Anfrage konnte nicht verarbeitet werden');
        expect(screen.getByText('Eigene Stimme')).toBeVisible();
        expect(screen.getByRole('button', {name: 'Stimme zurücknehmen'})).toBeVisible();
    });

    it('stops polling while offline and resumes when the tab comes online', async () => {
        vi.useFakeTimers();
        const result = {...resultsFor(7), state: 'active' as const};
        const getPollResults = vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(result);
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderResultsPage();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            vi.advanceTimersByTime(0);
            await Promise.resolve();
        });
        await act(async () => {
            window.dispatchEvent(new Event('offline'));
            await Promise.resolve();
        });
        await act(async () => {
            vi.advanceTimersByTime(10_000);
        });
        expect(getPollResults).toHaveBeenCalledTimes(1);

        await act(async () => {
            window.dispatchEvent(new Event('online'));
            await Promise.resolve();
        });
        await act(async () => {
            vi.advanceTimersByTime(5_000);
            await Promise.resolve();
        });
        expect(getPollResults).toHaveBeenCalledTimes(2);
    });

    it('stops polling after a refresh error', async () => {
        vi.useFakeTimers();
        const result = {...resultsFor(7), state: 'active' as const};
        const getPollResults = vi.spyOn(apiClient, 'getPollResults')
            .mockResolvedValueOnce(result)
            .mockRejectedValueOnce(new Error('offline'));
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});

        renderResultsPage();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            vi.advanceTimersByTime(0);
            await Promise.resolve();
        });
        await act(async () => {
            vi.advanceTimersByTime(5_000);
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(getPollResults).toHaveBeenCalledTimes(2);
        await act(async () => {
            vi.advanceTimersByTime(10_000);
        });
        expect(getPollResults).toHaveBeenCalledTimes(2);
    });
});
