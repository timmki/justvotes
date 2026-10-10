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
    if (presentation.status === 'error') {
        let error;
        if (presentation.error instanceof ApiError) error = presentation.error.frontend;
        return <RouteState status="error" error={error} onRetry={() => {
            void query.refetch();
        }}/>;
    }
    if (presentation.data === undefined) return <RouteState status="empty"/>;
    return <>{children(presentation.data)}</>;
}
