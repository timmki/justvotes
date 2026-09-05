import {apiClient} from '../../shared/api/client';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';

type PollQueryOptions = {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
};

export function usePollsQuery() {
    return useApiQuery(queryKeys.publicPolls, () => apiClient.getPublicPolls());
}

export function usePollQuery(pollId: string) {
    return useApiQuery(queryKeys.poll(pollId), () => apiClient.getPoll(pollId));
}

export function usePollResultsQuery(pollId: string, options: PollQueryOptions = {}) {
    return useApiQuery(queryKeys.pollResults(pollId), () => apiClient.getPollResults(pollId), options);
}

export function usePollAuditQuery(pollId: string) {
    return useApiQuery(queryKeys.pollAudit(pollId), () => apiClient.getPollAudit(pollId));
}
