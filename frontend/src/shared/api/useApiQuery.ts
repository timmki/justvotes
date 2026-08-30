import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

export function useApiQuery<T>(queryKey: QueryKey, queryFn: () => Promise<T>, options: { enabled?: boolean } = {}): UseQueryResult<T, unknown> {
  return useQuery({ queryKey, queryFn, retry: false, ...options });
}
