import {type QueryKey, useQuery, type UseQueryResult} from '@tanstack/react-query';

export function useApiQuery<T>(queryKey: QueryKey, queryFn: () => Promise<T>, options: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
} = {}): UseQueryResult<T, unknown> {
    return useQuery({queryKey, queryFn, retry: false, ...options});
}
