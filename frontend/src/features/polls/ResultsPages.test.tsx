import '@testing-library/jest-dom/vitest';
import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {ResultsPage} from './ResultsPages';
import {renderPollTest, usePollTestLifecycle} from './pollTestSupport';

usePollTestLifecycle();

describe('ResultsPages', () => {
    it('renders the shared results projection through the results route', async () => {
        vi.spyOn(apiClient, 'getPollResults').mockResolvedValue({
            id: 'poll-1', title: 'Team-Ausflug', visibility: 'public', state: 'expired',
            createdAt: '2026-08-01T10:00:00Z', endsAt: null, totalVotes: 1,
            options: [{number: 1, text: 'Ja', voteCount: 1, votes: []}],
        });
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: null});

        renderPollTest('/poll/results/poll-1', <Routes><Route path="/poll/results/:pollId" element={<ResultsPage/>}/></Routes>);

        expect(await screen.findByRole('heading', {name: 'Ja', level: 3})).toBeVisible();
        expect(screen.getAllByText('100 %').length).toBeGreaterThan(0);
    });
});
