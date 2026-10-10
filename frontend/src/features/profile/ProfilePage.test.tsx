import '@testing-library/jest-dom/vitest';
import {screen, fireEvent, act} from '@testing-library/react';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {renderPollTest, usePollTestLifecycle} from '../polls/pollTestSupport';
import {ProfilePage} from './ProfilePage';

usePollTestLifecycle();
const vote = {poll: {id: 'p_v1_one', title: 'Transport', state: 'active' as const}, option: {number: 2, text: 'Train'}, votedAt: '2026-09-15T12:00:00Z'};
describe('ProfilePage', () => {
    it('replaces option and timestamp, removes withdrawn votes, and replaces identity on refetch', async () => {
        const request = vi.spyOn(apiClient, 'getCurrentIdentityVotes').mockResolvedValue({userID: 'Alice', votes: [vote]});
        renderPollTest('/profile', <ProfilePage/>);
        expect(await screen.findByText('Train')).toBeVisible();
        const replacement = {...vote, option: {number: 1, text: 'Bike'}, votedAt: '2026-09-16T12:00:00Z'};
        request.mockResolvedValue({userID: 'Alice', votes: [replacement]});
        await act(() => queryClient.invalidateQueries({queryKey: queryKeys.identityVotes}));
        expect(await screen.findByText('Bike')).toBeVisible();
        expect(screen.queryByText('Train')).not.toBeInTheDocument();
        expect(document.querySelector('time')).toHaveAttribute('datetime', replacement.votedAt);
        request.mockResolvedValue({userID: 'Alice', votes: []});
        await act(() => queryClient.invalidateQueries({queryKey: queryKeys.identityVotes}));
        expect(await screen.findByText('Keine aktuelle Stimme')).toBeVisible();
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
        request.mockResolvedValue({userID: 'Bob', votes: [{...vote, poll: {...vote.poll, title: 'Bob poll'}}]});
        await act(() => queryClient.invalidateQueries({queryKey: queryKeys.identityVotes}));
        expect(await screen.findByText('Bob poll')).toBeVisible();
        expect(screen.getByText('Bob')).toBeVisible();
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
    it('distinguishes missing identity and reuses the existing identity editor', async () => {
        vi.spyOn(apiClient, 'getCurrentIdentityVotes').mockResolvedValue({userID: null, votes: []});
        renderPollTest('/profile', <ProfilePage/>);
        expect(await screen.findByText('Zuerst eine Identität setzen')).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: 'Identität bearbeiten'}));
        expect(screen.getByLabelText('Neue Identität')).toBeVisible();
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
        expect(screen.queryByText('Keine aktuelle Stimme')).not.toBeInTheDocument();
    });
    it('distinguishes a set identity with no current public votes', async () => {
        vi.spyOn(apiClient, 'getCurrentIdentityVotes').mockResolvedValue({userID: 'Alice', votes: []});
        renderPollTest('/profile', <ProfilePage/>);
        expect(await screen.findByText('Keine aktuelle Stimme')).toBeVisible();
        expect(screen.getByText('Alice')).toBeVisible();
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
        expect(screen.queryByText('Zuerst eine Identität setzen')).not.toBeInTheDocument();
    });
    it('shows only current personal fields without technical IDs or unrelated voters', async () => {
        vi.spyOn(apiClient, 'getCurrentIdentityVotes').mockResolvedValue({userID: 'Älice #1', votes: [vote,
            {...vote, poll: {id: 'p_v1_two', title: 'Second poll', state: 'archived'}, option: {number: 1, text: 'Bike'}}]});
        renderPollTest('/profile', <ProfilePage/>);
        expect(await screen.findByText('Transport')).toBeVisible();
        expect(screen.getByText('Älice #1')).toBeVisible();
        expect(screen.getByText('Train')).toBeVisible();
        expect(screen.getByText('Second poll')).toBeVisible();
        expect(document.querySelectorAll('.profile-vote')).toHaveLength(2);
        expect(screen.getByText('aktiv')).toBeVisible();
        expect(document.querySelector('time')).toHaveAttribute('datetime', vote.votedAt);
        expect(document.body).not.toHaveTextContent('p_v1_one');
        expect(document.body).not.toHaveTextContent('Bob');
    });
    it('presents a loading state without personal entries', () => {
        vi.spyOn(apiClient, 'getCurrentIdentityVotes').mockReturnValue(new Promise(() => {}));
        renderPollTest('/profile', <ProfilePage/>);
        expect(screen.getByRole('status')).toHaveTextContent('Wird geladen');
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
    });
    it('offers retry after a failed query', async () => {
        const request = vi.spyOn(apiClient, 'getCurrentIdentityVotes').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({userID: 'Alice', votes: [vote]});
        renderPollTest('/profile', <ProfilePage/>);
        fireEvent.click(await screen.findByRole('button', {name: 'Erneut versuchen'}));
        expect(await screen.findByText('Transport')).toBeVisible();
        expect(request).toHaveBeenCalledTimes(2);
    });
});
