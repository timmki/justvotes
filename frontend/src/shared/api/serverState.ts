export type QueryPresentation<T> = {
  data: T | undefined;
  status: 'loading' | 'error' | 'success';
  stale: boolean;
  error: unknown;
};

export function presentQuery<T>(query: { data?: T; isPending: boolean; isError: boolean; isFetching: boolean; isStale: boolean; error: unknown }): QueryPresentation<T> {
  return {
    data: query.data,
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'success',
    stale: query.isFetching,
    error: query.error,
  };
}
