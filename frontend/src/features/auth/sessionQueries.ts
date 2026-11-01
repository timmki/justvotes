import {apiClient, type CurrentSession} from '../../shared/api/client';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';

export type {CurrentSession};

/**
 * The signed-in account. Resolves to null without a valid session; the whole application is gated on it.
 */
export function useSessionQuery() {
    return useApiQuery<CurrentSession | null>(queryKeys.session, () => apiClient.getSession());
}

export function homeRoute(session: CurrentSession) {
    if (session.role === 'admin') return '/admin/votes';
    return '/polls';
}

/**
 * Whether the role may open a route; used to send people back to their own area.
 */
export function routeAllowed(session: CurrentSession, pathname: string) {
    if (pathname === '/password' || pathname === '/invitation') return true;
    const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    if (session.role === 'admin') return adminRoute;
    return !adminRoute;
}
