import {useEffect, useState} from 'react';
import {usePollResultsQuery} from './pollQueries';

// This adapter owns the visibility, connectivity, timer, and stop semantics of live results.
export function usePollingResultsQuery(pollId: string) {
    const [isVisible, setIsVisible] = useState(() => document.visibilityState !== 'hidden');
    const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
    const query = usePollResultsQuery(pollId, {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    useEffect(() => {
        const visibilityChanged = () => setIsVisible(document.visibilityState !== 'hidden');
        const online = () => setIsOnline(true);
        const offline = () => setIsOnline(false);
        document.addEventListener('visibilitychange', visibilityChanged);
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        return () => {
            document.removeEventListener('visibilitychange', visibilityChanged);
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
        };
    }, []);

    useEffect(() => {
        if (!isVisible || !isOnline || query.data?.state !== 'active' || query.isError) return;
        let disposed = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const poll = async () => {
            const refreshed = await query.refetch();
            if (!disposed && !refreshed.isError && refreshed.data?.state === 'active') timer = setTimeout(poll, 5_000);
        };
        timer = setTimeout(poll, 5_000);
        return () => {
            disposed = true;
            if (timer) clearTimeout(timer);
        };
    }, [isOnline, isVisible, query.data?.state, query.isError, query.refetch]);

    return query;
}
