import '@testing-library/jest-dom/vitest';
import {fireEvent, screen, within} from '@testing-library/react';
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

        renderPollTest('/polls?date=date&from=2020-01-01&to=2099-12-31', <Routes><Route path="/polls" element={<PollsPage/>}/></Routes>);

        expect(await screen.findByRole('link', {name: /Team-Ausflug/})).toBeVisible();
    });
});

describe('PollsPage filter empty state', () => {
    it('names the active filter without matches and resets to all polls', async () => {
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([{
            id: 'poll-today', title: 'Heute', visibility: 'public', state: 'active',
            createdAt: new Date().toISOString(), endsAt: null, totalVotes: 0,
            templateGroup: {id: 'group-1', name: 'Gruppe', description: 'Beschreibung'},
            templateSnapshotOptions: [], options: [],
        }]);

        renderPollTest('/polls?date=tomorrow', <Routes><Route path="/polls" element={<PollsPage/>}/></Routes>);

        expect(await screen.findByText('Keine Abstimmungen für „Morgen“')).toBeVisible();
        fireEvent.click(within(screen.getByRole('region', {name: 'Seitenstatus'})).getByRole('button', {name: 'Filter zurücksetzen'}));
        expect(await screen.findByRole('link', {name: /Heute/})).toBeVisible();
        expect(screen.getByLabelText('Datum')).toHaveValue('all');
    });

    it('offers no reset action in the generic empty state for all polls', async () => {
        vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([]);

        renderPollTest('/polls', <Routes><Route path="/polls" element={<PollsPage/>}/></Routes>);

        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();
        expect(within(screen.getByRole('region', {name: 'Seitenstatus'})).queryByRole('button', {name: 'Filter zurücksetzen'})).toBeNull();
    });
});
