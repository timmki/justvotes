import '@testing-library/jest-dom/vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {PollPage} from './PollPage';
import {renderPollTest, usePollTestLifecycle} from './pollTestSupport';
import {mockSession, userSession} from '../../test/sessions';

usePollTestLifecycle();

const basePoll = {
    id: 'poll-1', title: 'Team-Ausflug', visibility: 'public' as const, state: 'active' as const,
    createdAt: '2026-08-01T10:00:00Z', endsAt: '2026-10-31T18:50:00Z', totalVotes: 1,
    templateGroup: {id: 'group-1', name: 'Gruppe', description: 'Beschreibung'},
    templateSnapshotOptions: [{number: 1, text: 'Ja'}, {number: 2, text: 'Nein'}],
    options: [{number: 1, text: 'Ja'}, {number: 2, text: 'Nein'}],
};

type PollState = 'active' | 'expired' | 'archived';

function resultsFor(state: PollState, ownOption: number | null) {
    return {
        id: basePoll.id, title: basePoll.title, visibility: basePoll.visibility, state,
        createdAt: basePoll.createdAt, endsAt: basePoll.endsAt, totalVotes: Number(ownOption !== null),
        options: basePoll.options.map((option) => {
            const votes = [];
            if (option.number === ownOption) votes.push({userID: 'alice', votedAt: '2026-08-01T10:01:00Z'});
            return {...option, voteCount: votes.length, votes};
        }),
    };
}

function renderPoll() {
    return renderPollTest('/poll/poll-1', <Routes><Route path="/poll/:pollId" element={<PollPage/>}/></Routes>);
}

describe('PollPage', () => {
    it('keeps results release policy local to the detail route', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue({...basePoll, endsAt: null, totalVotes: 0});
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'results-not-available'}, 403));

        renderPoll();

        expect(await screen.findByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
    });
});

describe('PollPage for a poll that is not active (spec 009, US2)', () => {
    it('puts the notice and the results action before a read-only option list', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue({...basePoll, state: 'expired'});
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor('expired', 2));

        renderPoll();

        const notice = await screen.findByText('Diese Abstimmung ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.');
        const resultsLink = await screen.findByRole('link', {name: 'Ergebnisse ansehen'});
        expect(resultsLink).toHaveAttribute('href', '/poll/results/poll-1');
        const optionsHeading = screen.getByRole('heading', {name: 'Optionen'});
        expect(notice.compareDocumentPosition(optionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(resultsLink.compareDocumentPosition(optionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(screen.queryByText('Stimme abgeben')).toBeNull();
        expect(screen.getByText('Nein').closest('li')).toHaveTextContent('Eigene Stimme');
        expect(screen.getByText('Ja').closest('li')).not.toHaveTextContent('Eigene Stimme');
    });

    it('names an archived poll as archived', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue({...basePoll, state: 'archived'});
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor('archived', null));

        renderPoll();

        expect(await screen.findByText('Diese Abstimmung ist archiviert. Eine Stimmabgabe ist nicht mehr möglich.')).toBeVisible();
    });

    it('explains unreleased results without a results action', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue({...basePoll, state: 'expired'});
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'results-not-available'}, 403));

        renderPoll();

        expect(await screen.findByText('Die Ergebnisse sind noch nicht freigegeben.')).toBeVisible();
        expect(screen.queryByRole('link', {name: 'Ergebnisse ansehen'})).toBeNull();
    });

    it('keeps the voting form for an active poll', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue(basePoll);
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor('active', 2));

        renderPoll();

        await waitFor(() => expect(screen.getByRole('radio', {name: 'Nein'})).toBeChecked());
        expect(screen.getByRole('group', {name: 'Stimme abgeben'})).toBeVisible();
        expect(screen.queryByText(/Eine Stimmabgabe ist nicht mehr möglich/)).toBeNull();
    });

    it('keeps the vote button unavailable while the own vote is selected (FR-019 exception)', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue(basePoll);
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor('active', 2));

        renderPoll();

        await waitFor(() => expect(screen.getByRole('radio', {name: 'Nein'})).toBeChecked());
        expect(screen.queryByRole('button', {name: /^Stimme abgeben/})).toBeNull();
        expect(screen.getByRole('radio', {name: 'Nein'}).closest('.poll-option')).not.toBeNull();
        fireEvent.click(screen.getByRole('radio', {name: 'Ja'}));
        expect(screen.getByRole('button', {name: 'Stimme abgeben: Ja'})).toBeEnabled();
        fireEvent.click(screen.getByRole('radio', {name: 'Nein'}));
        expect(screen.queryByRole('button', {name: /^Stimme abgeben/})).toBeNull();
    });

    it('reloads the poll when a vote fails because the poll is no longer active', async () => {
        const getPoll = vi.spyOn(apiClient, 'getPoll').mockResolvedValueOnce(basePoll).mockResolvedValue({...basePoll, state: 'expired'});
        mockSession(userSession('alice'));
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue(resultsFor('active', 2));
        vi.spyOn(apiClient, 'castVote').mockRejectedValue(problemError({code: 'poll-not-active'}, 409));
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        renderPoll();

        await waitFor(() => expect(screen.getByRole('radio', {name: 'Nein'})).toBeChecked());
        fireEvent.click(screen.getByRole('radio', {name: 'Ja'}));
        fireEvent.click(screen.getByRole('button', {name: 'Stimme abgeben: Ja'}));

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({queryKey: queryKeys.poll('poll-1')}));
        expect(await screen.findByText('Diese Abstimmung ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.')).toBeVisible();
        expect(getPoll).toHaveBeenCalledTimes(2);
    });
});
