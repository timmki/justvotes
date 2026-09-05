import {describe, expect, it} from 'vitest';
import {problemError} from '../../shared/api/errors';
import {projectPollDomainEvents, projectPollList, projectPollResults, classifyResultsRelease, isResultsUnavailable} from './pollProjections';

const results = {
    id: 'poll-1',
    title: 'Team-Ausflug',
    visibility: 'public' as const,
    state: 'active' as const,
    createdAt: '2026-08-01T10:00:00Z',
    endsAt: null,
    totalVotes: 3,
    options: [
        {number: 1, text: 'Zebra', voteCount: 1, votes: []},
        {number: 2, text: 'Apfel', voteCount: 2, votes: [{userID: 'alice', votedAt: '2026-08-01T10:01:00Z'}]},
    ],
};

describe('poll projections', () => {
    it('keeps the list schema intact at the list boundary', () => {
        const poll = {id: 'poll-1'};
        expect(projectPollList(poll as never)).toBe(poll);
    });

    it('orders winners first, finds the current vote, and calculates the highest share', () => {
        const projection = projectPollResults(results, 'alice', 'de');

        expect(projection.orderedOptions.map((option) => option.text)).toEqual(['Apfel', 'Zebra']);
        expect(projection.winnerOptions.map((option) => option.text)).toEqual(['Apfel']);
        expect(projection.currentOptionNumber).toBe(2);
        expect(projection.highestPercentage).toBe(67);
    });

    it('normalizes audit entries newest first and safely labels unknown events', () => {
        const projection = projectPollDomainEvents([
            {event: 'PollPublished', actor: 'admin', occurredAt: '2026-08-01T10:00:00Z'},
            {event: 'FutureEvent', actor: 'system', occurredAt: '2026-08-01T10:01:00Z'} as never,
        ], (key) => key === 'audit.unknownEvent' ? 'Unknown' : 'Published');

        expect(projection.entries.map((entry) => entry.label)).toEqual(['Unknown', 'Published']);
        expect(projection.count).toBe(2);
    });

    it('classifies release states without rendering concerns', () => {
        expect(classifyResultsRelease({isPending: true, isError: false, forbiddenBeforeVote: false})).toBe('checking');
        expect(classifyResultsRelease({isPending: false, isError: true, forbiddenBeforeVote: true})).toBe('requiresVote');
        expect(classifyResultsRelease({isPending: false, isError: true, forbiddenBeforeVote: false})).toBe('unavailable');
        expect(classifyResultsRelease({isPending: false, isError: false, forbiddenBeforeVote: false})).toBe('available');
    });

    it('recognizes only the results-not-available response as release gating', () => {
        expect(isResultsUnavailable(problemError({code: 'results-not-available'}, 403))).toBe(true);
        expect(isResultsUnavailable(problemError({code: 'forbidden'}, 403))).toBe(false);
    });
});
