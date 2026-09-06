import type {UseQueryResult} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {ApiError} from '../api/errors';
import {presentQuery} from '../api/serverState';
import {RouteState} from './RouteState';

export function QueryState<T>({query, children}: {
    query: UseQueryResult<T, unknown>;
    children: (data: T) => ReactNode
}) {
    const presentation = presentQuery(query);
    if (presentation.status === 'loading') return <RouteState status="loading"/>;
    if (presentation.status === 'error') return <RouteState status="error"
                                                            error={presentation.error instanceof ApiError ? presentation.error.frontend : undefined}
                                                            onRetry={() => {
                                                                void query.refetch();
                                                            }}/>;
    return <>{presentation.data === undefined ?
        <RouteState status="empty"/> : children(presentation.data)}</>;
}
