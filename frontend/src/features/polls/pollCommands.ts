import {useMutation} from '@tanstack/react-query';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import type {TranslationKey} from '../../shared/i18n/translations';
import type {Vote} from './pollProjections';

type CastVoteCallbacks = {
    onMutate: (optionNumber: number) => number | null;
    onSuccess: (vote: Vote) => void;
    onError: (cause: unknown, optionNumber: number, previousOptionNumber: number | null) => void;
};

// Command hooks own server mutations and their four affected poll read caches.
export function useCastVoteMutation(pollId: string, callbacks: CastVoteCallbacks) {
    return useMutation<Vote, unknown, number, number | null>({
        mutationFn: (optionNumber) => apiClient.castVote(pollId, optionNumber),
        onMutate: callbacks.onMutate,
        onSuccess: async (vote) => {
            callbacks.onSuccess(vote);
            await invalidatePollQueries(pollId);
        },
        onError: (cause, optionNumber, previousOptionNumber) => callbacks.onError(cause, optionNumber, previousOptionNumber ?? null),
    });
}

type WithdrawVoteCallbacks = {
    onMutate: () => void;
    onSuccess: () => void;
    onError: (cause: unknown) => void;
};

export function useWithdrawVoteMutation(pollId: string, callbacks: WithdrawVoteCallbacks) {
    return useMutation<void, unknown, void>({
        mutationFn: () => apiClient.withdrawVote(pollId),
        onMutate: callbacks.onMutate,
        onSuccess: async () => {
            await invalidatePollQueries(pollId);
            callbacks.onSuccess();
        },
        onError: callbacks.onError,
    });
}

export async function invalidatePollQueries(pollId: string) {
    await Promise.all([
        queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
        queryClient.invalidateQueries({queryKey: queryKeys.poll(pollId)}),
        queryClient.invalidateQueries({queryKey: queryKeys.pollResults(pollId)}),
        queryClient.invalidateQueries({queryKey: queryKeys.pollAudit(pollId)}),
    ]);
}

export function frontendError(cause: unknown): FrontendError {
    if (cause instanceof ApiError) return cause.frontend;
    return {
        kind: 'network',
        status: null,
        code: 'unknown_error',
        detail: null,
        retryable: false,
        messageKey: 'errors.generic',
    };
}

export function voteFeedback(status: Vote['status'], t: (key: TranslationKey) => string) {
    switch (status) {
        case 'created':
            return t('polls.voteCreated');
        case 'replaced':
            return t('polls.voteReplaced');
        case 'unchanged':
            return t('polls.voteUnchanged');
    }
}
