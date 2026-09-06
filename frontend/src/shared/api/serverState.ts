export type QueryPresentation<T> = {
    data: T | undefined;
    status: 'loading' | 'error' | 'success';
    error: unknown;
};

export function presentQuery<T>(query: {
    data?: T;
    isPending: boolean;
    isError: boolean;
    error: unknown
}): QueryPresentation<T> {
    return {
        data: query.data,
        status: query.isPending ? 'loading' : query.isError ? 'error' : 'success',
        error: query.error,
    };
}
