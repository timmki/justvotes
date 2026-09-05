import '@testing-library/jest-dom/vitest';
import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {PollsPage} from './PollsPage';
import {renderPollTest, usePollTestLifecycle} from './pollTestSupport';

usePollTestLifecycle();

describe('PollsPage', () => {
    it('renders the public poll list through the focused page module', async () => {
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([{
            id: 'poll-1', title: 'Team-Ausflug', visibility: 'public', state: 'active',
            createdAt: '2026-08-01T10:00:00Z', endsAt: null, totalVotes: 0,
            templateGroup: {id: 'group-1', name: 'Gruppe', description: 'Beschreibung'},
            templateSnapshotOptions: [], options: [],
        }]);

        renderPollTest('/polls', <Routes><Route path="/polls" element={<PollsPage/>}/></Routes>);

        expect(await screen.findByRole('link', {name: /Team-Ausflug/})).toBeVisible();
    });
});
