import {QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor, cleanup} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createElement, type ReactNode} from 'react';
import {apiClient} from '../../shared/api/client';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useCastVoteMutation, useWithdrawVoteMutation} from './pollCommands';

const wrapper = ({children}: {children: ReactNode}) => createElement(QueryClientProvider, {client: queryClient}, children);
afterEach(() => {cleanup(); queryClient.clear(); vi.restoreAllMocks();});
describe('personal profile mutation freshness', () => {
    it('invalidates the personal query as well as all four poll reads after casting', async () => {
        vi.spyOn(apiClient, 'castVote').mockResolvedValue({status: 'created', optionNumber: 1});
        const invalidation = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
        const {result} = renderHook(() => useCastVoteMutation('p', {onMutate: () => null, onSuccess: vi.fn(), onError: vi.fn()}), {wrapper});
        act(() => result.current.mutate(1));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        for (const queryKey of [queryKeys.identityVotes, queryKeys.publicPolls, queryKeys.poll('p'), queryKeys.pollResults('p'), queryKeys.pollAudit('p')]) {
            expect(invalidation).toHaveBeenCalledWith({queryKey});
        }
    });
    it('invalidates the personal query after withdrawal but never after failure', async () => {
        vi.spyOn(apiClient, 'withdrawVote').mockResolvedValueOnce().mockRejectedValueOnce(new Error('offline'));
        const invalidation = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
        const {result} = renderHook(() => useWithdrawVoteMutation('p', {onMutate: vi.fn(), onSuccess: vi.fn(), onError: vi.fn()}), {wrapper});
        act(() => result.current.mutate());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidation).toHaveBeenCalledWith({queryKey: queryKeys.identityVotes});
        invalidation.mockClear();
        act(() => result.current.mutate());
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidation).not.toHaveBeenCalled();
    });
});
