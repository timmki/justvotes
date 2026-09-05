import '@testing-library/jest-dom/vitest';
import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {PollPage} from './PollPage';
import {renderPollTest, usePollTestLifecycle} from './pollTestSupport';

usePollTestLifecycle();

describe('PollPage', () => {
    it('keeps results release policy local to the detail route', async () => {
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue({
            id: 'poll-1', title: 'Team-Ausflug', visibility: 'public', state: 'active',
            createdAt: '2026-08-01T10:00:00Z', endsAt: null, totalVotes: 0,
            templateGroup: {id: 'group-1', name: 'Gruppe', description: 'Beschreibung'},
            templateSnapshotOptions: [{number: 1, text: 'Ja'}], options: [{number: 1, text: 'Ja'}],
        });
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'results-not-available'}, 403));

        renderPollTest('/poll/poll-1', <Routes><Route path="/poll/:pollId" element={<PollPage/>}/></Routes>);

        expect(await screen.findByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
    });
});
