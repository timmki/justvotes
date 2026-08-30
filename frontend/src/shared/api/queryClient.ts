import { QueryClient } from '@tanstack/react-query';
import { protectedQueryPrefixes } from './queryKeys';

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export function clearProtectedQueries(client: QueryClient = queryClient) {
  return client.removeQueries({ predicate: ({ queryKey }) => protectedQueryPrefixes.some((prefix) => prefix.every((part, index) => queryKey[index] === part)) });
}
