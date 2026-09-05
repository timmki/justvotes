import '@testing-library/jest-dom/vitest';
import {QueryClientProvider} from '@tanstack/react-query';
import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {I18nProvider} from '../../shared/i18n/I18nProvider';
import {AuditPage} from './AuditPage';
import {PollPage} from './PollPage';
import {PollsPage} from './PollsPage';
import {OptionPage, ResultsPage} from './ResultsPages';

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
                        <Route path="/poll/audit/:pollId" element={<p>Audit log</p>}/>
                    </Routes>
                </I18nProvider>
            </QueryClientProvider>
        </MemoryRouter>
    );
}

function renderAuditPage(initialEntry = '/poll/audit/poll-1') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <QueryClientProvider client={queryClient}>
                <I18nProvider>
                    <Routes>
                        <Route path="/poll/audit/:pollId" element={<AuditPage/>}/>
                        <Route path="/poll/:pollId" element={<p>Poll detail</p>}/>
                        <Route path="/poll/results/:pollId" element={<p>Poll results</p>}/>
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
        expect(card).not.toHaveTextContent('opaque-poll-id-123456789');
        expect(card).toHaveTextContent('Admin');
        expect(card).toHaveTextContent('aktiv');
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

    it('renders the poll sheet with real metadata, option numbers, and result release state', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'results-not-available'}, 403));

        renderPollPage();

        expect(await screen.findByRole('heading', {name: 'Team-Ausflug', level: 3})).toBeVisible();
        expect(screen.getByRole('complementary', {name: 'Abstimmungs-Metadaten'})).toHaveTextContent('01.08.2026');
        expect(screen.getByRole('complementary', {name: 'Abstimmungs-Metadaten'})).toHaveTextContent('01.01.2099');
        expect(screen.getByRole('complementary', {name: 'Abstimmungs-Metadaten'})).toHaveTextContent('1');
        expect(await screen.findByText('Nach eigener Stimme')).toBeVisible();
        expect(screen.getByRole('radio', {name: 'Apfel'}).parentElement).toHaveTextContent('Optionsnummer 7');
        expect(screen.getByRole('radio', {name: 'Zebra'}).parentElement).toHaveTextContent('Optionsnummer 2');
        expect(screen.queryByRole('button', {name: /Speichern/})).toBeNull();
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
        expect(await screen.findByRole('link', {name: 'Abstimmung - Ergebnisse'})).toHaveAttribute('href', `/poll/results/${poll.id}`);
    });

    it('keeps the current vote visible and blocks competing input during a mutation', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor(2));
        let finishVote: (() => void) | undefined;
        const castVote = vi.spyOn(apiClient, 'castVote').mockImplementation(() => new Promise((resolve) => {
            finishVote = () => resolve({status: 'replaced', optionNumber: 7});
        }));

        renderPollPage();

        const apple = await screen.findByRole('radio', {name: 'Apfel'});
        await waitFor(() => expect(screen.getByRole('radio', {name: 'Zebra'})).toBeChecked());
        expect(screen.getByRole('radio', {name: 'Zebra'}).parentElement).toHaveTextContent('Eigene Stimme');
        fireEvent.click(apple);

        expect(apple).toBeChecked();
        expect(screen.getByRole('group', {name: 'Stimme abgeben'})).toBeDisabled();
        expect(screen.getByRole('radio', {name: 'Zebra'}).parentElement).toHaveTextContent('Eigene Stimme');
        await waitFor(() => expect(castVote).toHaveBeenCalledWith(poll.id, 7));
        await act(async () => finishVote?.());
        expect(await screen.findByText('Stimme geändert.')).toBeVisible();
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

        expect(await screen.findByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
        expect(screen.getByRole('heading', {name: 'Team-Ausflug', level: 3})).toBeVisible();
        expect(screen.queryByText('Daten konnten nicht geladen werden')).toBeNull();
        expect(screen.queryByRole('link', {name: 'Abstimmung - Ergebnisse'})).toBeNull();
    });

    it('does not hide a non-results-forbidden error behind the not-voted state', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'forbidden'}, 403));

        renderPollPage();

        expect(await screen.findByRole('heading', {name: 'Diese Aktion ist nicht erlaubt.', level: 3})).toBeVisible();
        expect(screen.queryByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeNull();
    });

    it('hides stale results links while a released-results refetch is forbidden', async () => {
        let rejectRefetch: ((reason?: unknown) => void) | undefined;
        const getPollResults = vi.spyOn(apiClient, 'getPollResults')
            .mockResolvedValueOnce(resultsFor(7))
            .mockImplementationOnce(() => new Promise((_, reject) => {
                rejectRefetch = reject;
            }));

        renderPollPage();

        expect(await screen.findByRole('link', {name: 'Abstimmung - Ergebnisse'})).toBeVisible();
        const invalidation = queryClient.invalidateQueries({queryKey: queryKeys.pollResults(poll.id)});
        await waitFor(() => expect(getPollResults).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole('link', {name: 'Abstimmung - Ergebnisse'})).toBeNull();
        rejectRefetch?.(problemError({code: 'results-not-available'}, 403));
        await invalidation;

        expect(await screen.findByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
        expect(screen.getByRole('radio', {name: 'Apfel'})).not.toBeChecked();
        expect(screen.queryByRole('link', {name: 'Abstimmung - Ergebnisse'})).toBeNull();
        expect(getPollResults).toHaveBeenCalledTimes(2);
    });

    it('disables voting for an expired poll but keeps released results available', async () => {
        const expiredPoll = {...poll, state: 'expired' as const};
        vi.mocked(apiClient.getPoll).mockResolvedValue(expiredPoll);
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: null});
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(null), state: 'expired' as const});

        renderPollPage();

        expect(await screen.findByText(/Diese Abstimmung ist nicht mehr aktiv.*abgelaufen/)).toBeVisible();
        expect(screen.getByRole('radio', {name: 'Apfel'})).toBeDisabled();
        expect(await screen.findByRole('link', {name: 'Abstimmung - Ergebnisse'})).toBeVisible();
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

    it('renders a result sheet summary and a real current-leader panel', async () => {
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

        const sheet = await screen.findByRole('region', {name: 'Ergebnisübersicht'});
        expect(sheet).toHaveTextContent('Team-Ausflug');
        expect(sheet).toHaveTextContent('3');
        expect(sheet).toHaveTextContent('67 %');
        expect(screen.getByRole('complementary', {name: 'Aktueller Spitzenstand'})).toHaveTextContent('Apfel');
        expect(screen.getByRole('complementary', {name: 'Aktueller Spitzenstand'})).toHaveTextContent('01.01.2099');
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
        expect(screen.getByRole('region', {name: 'Ergebnisübersicht'})).toHaveTextContent('67 %');
        expect(screen.getByText('33 %')).toBeVisible();
        expect(screen.getAllByText('Gewinner')).toHaveLength(2);
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Apfel', 'Zebra', 'Abstimmungen', 'Audit Log']);

        const zeroResult = {...result, totalVotes: 0, options: result.options.map((option) => ({...option, voteCount: 0, votes: []}))};
        vi.mocked(apiClient.getPollResults).mockResolvedValue(zeroResult);
        await act(async () => {
            await queryClient.invalidateQueries({queryKey: queryKeys.pollResults(poll.id)});
        });
        await waitFor(() => expect(screen.getByRole('complementary', {name: 'Aktueller Spitzenstand'}))
            .toHaveTextContent('Noch kein Spitzenstand'));
        expect(screen.getByRole('complementary', {name: 'Aktueller Spitzenstand'})).toHaveTextContent('0 %');
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
        const sheet = screen.getByRole('region', {name: 'Ergebnisübersicht'});
        expect(within(sheet).getAllByText('Gleichstand')).toHaveLength(2);
        expect(screen.getByRole('complementary', {name: 'Aktueller Spitzenstand'})).toHaveTextContent('Apfel, Zebra');

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

    it('shows a direct option link with a running identity number and localized timestamp', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(7), options: [{
            ...poll.options[1],
            voteCount: 1,
            votes: [{userID: 'alice', votedAt: '2026-08-01T10:01:00Z'}],
        }]});

        renderResultsPage('/poll/results/poll-1/option/7');

        expect(await screen.findByRole('heading', {name: 'Apfel', level: 3})).toBeVisible();
        expect(within(screen.getByRole('region', {name: 'Optionsübersicht'})).getByText('Team-Ausflug')).toBeVisible();
        expect(screen.getByText('alice')).toBeVisible();
        expect(within(screen.getByRole('list', {name: 'Abstimmende Identitäten'})).getByText(/01\.08\.2026/)).toBeVisible();
    });

    it('renders the option sheet with context, complete identity order, and navigation', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(7), options: [{
            ...poll.options[1],
            voteCount: 2,
            votes: [
                {userID: 'first.identity', votedAt: '2026-08-01T10:01:00Z'},
                {userID: 'second.identity', votedAt: '2026-08-01T10:02:00Z'},
            ],
        }]});

        renderResultsPage('/poll/results/poll-1/option/7');

        const sheet = await screen.findByRole('region', {name: 'Optionsübersicht'});
        expect(sheet).toHaveTextContent('Team-Ausflug');
        expect(sheet).toHaveTextContent('Apfel');
        expect(sheet).toHaveTextContent(/Optionsnummer\s*7/);
        expect(sheet).toHaveTextContent('2');
        expect(screen.getByRole('complementary', {name: 'Option-Kontext'})).toHaveTextContent('aktiv');
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            expect.stringContaining('first.identity'), expect.stringContaining('second.identity'),
        ]);
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Abstimmung - Ergebnisse', 'Audit Log']);

        fireEvent.click(screen.getByRole('link', {name: 'Audit Log'}));
        expect(screen.getByText('Audit log')).toBeVisible();
    });

    it('shows a clear empty state for an option without Stimmen and a missing option', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(null), options: [{
            ...poll.options[1], voteCount: 0, votes: [],
        }]});

        renderResultsPage('/poll/results/poll-1/option/7');

        expect(await screen.findByText('Für diese Option liegen noch keine Stimmen vor.')).toBeVisible();
        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();
        expect(screen.getByRole('region', {name: 'Seitenstatus'})).toHaveTextContent('Noch keine Daten vorhanden');

        cleanup();
        queryClient.clear();
        vi.restoreAllMocks();
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor(7));
        renderResultsPage('/poll/results/poll-1/option/99');

        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();
        expect(screen.queryByRole('heading', {name: 'Apfel', level: 3})).toBeNull();
    });

    it('localizes the option context and empty state in English', async () => {
        window.localStorage.setItem('justvotes-locale', 'en');
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({...resultsFor(null), options: [{
            ...poll.options[1], voteCount: 0, votes: [],
        }]});

        renderResultsPage('/poll/results/poll-1/option/7');

        expect(await screen.findByRole('region', {name: 'Option overview'})).toBeVisible();
        expect(screen.getByRole('complementary', {name: 'Option context'})).toHaveTextContent('active');
        expect(screen.getByText('No votes have been cast for this option yet.')).toBeVisible();
    });

    it('polls active option details while the tab is visible', async () => {
        vi.useFakeTimers();
        const result = {...resultsFor(7), state: 'active' as const};
        const getPollResults = vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(result);

        renderResultsPage('/poll/results/poll-1/option/7');
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            vi.advanceTimersByTime(0);
            await Promise.resolve();
        });
        expect(getPollResults).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(5_001);
            await Promise.resolve();
        });
        expect(getPollResults).toHaveBeenCalledTimes(2);
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

describe('AuditPage', () => {
    it('rendert bekannte Domaenenereignisse mit neuesten zuerst und lokalisierten Details', async () => {
        vi.spyOn(apiClient, 'getPollAudit').mockResolvedValue([
            {event: 'PollPublished', actor: 'admin', occurredAt: '2026-08-01T10:00:00Z'},
            {event: 'VoteCast', actor: 'alice', occurredAt: '2026-08-01T10:01:00Z', selection: 'Ja', userID: 'alice', optionNumber: 1, votedAt: '2026-08-01T10:01:00Z'},
            {event: 'VoteRemovedByAdmin', actor: 'admin', occurredAt: '2026-08-01T10:02:00Z', selection: null, reason: 'Korrektur', userID: 'alice', optionNumber: 1, votedAt: '2026-08-01T10:01:00Z'},
        ]);

        renderAuditPage();

        const sheet = await screen.findByRole('region', {name: 'Domänenereignis-Timeline'});
        expect(sheet).toBeVisible();
        expect(screen.getByRole('complementary', {name: 'Audit-Kontext'})).toHaveTextContent('3');
        expect(await screen.findByRole('heading', {name: 'Audit Log', level: 1})).toBeVisible();
        expect(await screen.findByRole('heading', {name: 'Stimme administrativ entfernt', level: 3})).toBeVisible();
        expect(screen.getAllByRole('heading', {level: 3}).map((heading) => heading.textContent)).toEqual([
            'Stimme administrativ entfernt', 'Stimme abgegeben', 'Abstimmung veröffentlicht',
        ]);
        expect(screen.getAllByText('alice')).toHaveLength(3);
        expect(screen.getByText('Ja')).toBeVisible();
        expect(screen.getByText('Optionsnummer 1')).toBeVisible();
        expect(screen.getByText('Korrektur')).toBeVisible();
        expect(screen.getAllByText(/01\.08\.2026/).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', {name: 'Abstimmungen'})).toHaveAttribute('href', '/poll/poll-1');
        expect(screen.getByRole('link', {name: 'Abstimmung - Ergebnisse'})).toHaveAttribute('href', '/poll/results/poll-1');
    });

    it('lokalisiert jedes Vertrags-Domaenenereignis und behandelt unbekannte zukuenftige Werte sicher', async () => {
        const knownEvents = [
            ['PollPublished', 'Abstimmung veröffentlicht', 'Poll published'],
            ['PollExpired', 'Abstimmung abgelaufen', 'Poll expired'],
            ['PollArchived', 'Abstimmung archiviert', 'Poll archived'],
            ['PollRestoredFromArchive', 'Abstimmung aus Archiv wiederhergestellt', 'Poll restored from archive'],
            ['PollExpiryChanged', 'Ablauf geändert', 'Expiry changed'],
            ['PollReopened', 'Abstimmung wieder geöffnet', 'Poll reopened'],
            ['PollSoftDeleted', 'Abstimmung soft gelöscht', 'Poll soft-deleted'],
            ['PollRestored', 'Abstimmung wiederhergestellt', 'Poll restored'],
            ['VoteCast', 'Stimme abgegeben', 'Vote cast'],
            ['VoteReplaced', 'Stimme ersetzt', 'Vote replaced'],
            ['VoteWithdrawn', 'Stimme zurückgenommen', 'Vote withdrawn'],
            ['VoteRemovedForIdentityChange', 'Stimme wegen Identitätswechsel entfernt', 'Vote removed for identity change'],
            ['VoteRemovedByAdmin', 'Stimme administrativ entfernt', 'Vote removed by admin'],
        ] as const;
        const auditEntries = [
            ...knownEvents.map(([event]) => ({event, actor: 'admin', occurredAt: '2026-08-01T10:00:00Z'})),
            {event: 'FutureEvent', actor: 'system', occurredAt: '2026-08-01T10:01:00Z'} as never,
        ];
        vi.spyOn(apiClient, 'getPollAudit').mockResolvedValue(auditEntries);

        renderAuditPage();

        for (const [, label] of knownEvents) expect(await screen.findByText(label)).toBeVisible();
        expect(screen.getByText('Unbekanntes Domänenereignis')).toBeVisible();

        cleanup();
        queryClient.clear();
        window.localStorage.setItem('justvotes-locale', 'en');
        vi.mocked(apiClient.getPollAudit).mockResolvedValue(auditEntries);
        renderAuditPage();
        for (const [, , label] of knownEvents) expect(await screen.findByText(label)).toBeVisible();
        expect(screen.getByText('Unknown domain event')).toBeVisible();
    });

    it('renders every delivered optional field without depending on event family', async () => {
        vi.spyOn(apiClient, 'getPollAudit').mockResolvedValue([{
            event: 'PollPublished', actor: 'admin', occurredAt: '2026-08-01T10:00:00Z',
            selection: 'Ja', optionNumber: 1, userID: 'alice', reason: 'Initialisierung', votedAt: '2026-08-01T09:59:00Z',
        }]);

        renderAuditPage();

        const timeline = await screen.findByRole('list', {name: 'Domänenereignis-Timeline'});
        expect(timeline).toHaveTextContent('Ja');
        expect(timeline).toHaveTextContent('alice');
        expect(timeline).toHaveTextContent('Initialisierung');
        expect(timeline).toHaveTextContent('Stimmzeitpunkt');
        expect(timeline.querySelector('time[datetime="2026-08-01T09:59:00Z"]')).not.toBeNull();
    });

    it('shows explicit empty and safe not-found states', async () => {
        vi.spyOn(apiClient, 'getPollAudit').mockResolvedValue([]);
        renderAuditPage();
        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();

        cleanup();
        queryClient.clear();
        vi.restoreAllMocks();
        vi.spyOn(apiClient, 'getPollAudit').mockRejectedValue(problemError({}, 404));
        renderAuditPage();
        expect(await screen.findByRole('heading', {name: 'Seite nicht gefunden', level: 3})).toBeVisible();
    });
});
