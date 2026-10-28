import '@testing-library/jest-dom/vitest';
import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {ResultsPage} from './ResultsPages';
import {renderPollTest, usePollTestLifecycle} from './pollTestSupport';
import {adminSession, mockSession, userSession} from '../../test/sessions';

usePollTestLifecycle();

describe('ResultsPages', () => {
    it('renders the shared results projection through the results route', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({
            id: 'poll-1', title: 'Team-Ausflug', visibility: 'public', state: 'expired',
            createdAt: '2026-08-01T10:00:00Z', endsAt: null, totalVotes: 1,
            options: [{number: 1, text: 'Ja', voteCount: 1, votes: []}],
        });
        mockSession(userSession('not-a-voter'));

        renderPollTest('/poll/results/poll-1', <Routes><Route path="/poll/results/:pollId" element={<ResultsPage/>}/></Routes>);

        expect(await screen.findByRole('heading', {name: 'Ja', level: 3})).toBeVisible();
        expect(screen.getAllByText('100 %').length).toBeGreaterThan(0);
    });
});

describe('ResultsPages vote labels', () => {
    it('labels option vote counts as singular and plural text', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({
            id: 'poll-1', title: 'Team-Ausflug', visibility: 'public', state: 'expired',
            createdAt: '2026-08-01T10:00:00Z', endsAt: null, totalVotes: 3,
            options: [
                {number: 1, text: 'Ja', voteCount: 1, votes: []},
                {number: 2, text: 'Nein', voteCount: 2, votes: []},
            ],
        });
        mockSession(userSession('not-a-voter'));

        const {container} = renderPollTest('/poll/results/poll-1', <Routes><Route path="/poll/results/:pollId" element={<ResultsPage/>}/></Routes>);

        await vi.waitFor(() => expect(container.querySelectorAll('.result-option-meta')).toHaveLength(2));
        const meta = Array.from(container.querySelectorAll('.result-option-meta')).map((element) => element.textContent ?? '');
        expect(meta.some((text) => text.includes('1 Stimme'))).toBe(true);
        expect(meta.some((text) => text.includes('2 Stimmen'))).toBe(true);
    });
});
