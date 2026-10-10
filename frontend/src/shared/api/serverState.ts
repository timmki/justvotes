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
    let status: QueryPresentation<T>['status'] = 'success';
    if (query.isPending) status = 'loading';
    else if (query.isError) status = 'error';
    return {
        data: query.data,
        status,
        error: query.error,
    };
}
