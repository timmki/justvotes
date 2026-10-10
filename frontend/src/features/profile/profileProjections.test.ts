import {describe, expect, it} from 'vitest';
import {projectPersonalVotes, type PersonalVote} from './profileProjections';

describe('personal vote projection', () => {
    it('orders newest first with exact poll ID tie breaking and localized labels without mutating input', () => {
        const vote = (id: string, votedAt: string): PersonalVote => ({poll: {id, title: 'Transport', state: 'active'}, option: {number: 2, text: 'Train'}, votedAt});
        const input = [vote('b', '2026-01-01T00:00:00Z'), vote('a', '2026-01-01T00:00:00Z'), vote('c', '2026-02-01T00:00:00Z')];
        const result = projectPersonalVotes(input, 'en', key => key);
        expect(result.map(v => v.pollId)).toEqual(['c', 'a', 'b']);
        expect(input.map(v => v.poll.id)).toEqual(['b', 'a', 'c']);
        expect(result[0]).toMatchObject({title: 'Transport', option: 'Train', optionNumber: 2, state: 'profile.active'});
        expect(result[0].timestamp).toContain('UTC');
    });
});
