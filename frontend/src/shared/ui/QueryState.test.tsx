import {QueryClient, QueryClientProvider, useQuery} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {useApiQuery} from '../api/useApiQuery';
import {networkError} from '../api/errors';
import {I18nProvider} from '../i18n/I18nProvider';
import {QueryState} from './QueryState';
import {afterEach, describe, expect, it} from 'vitest';

afterEach(cleanup);

describe('QueryState', () => {
    it('offers a manual retry after a network failure', async () => {
        let attempts = 0;
        const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});

        function Harness() {
            const query = useApiQuery(['retryable-request'], async () => {
                attempts += 1;
                if (attempts === 1) throw networkError(new Error('offline'));
                return 'loaded';
            });
            return <QueryState query={query}>{(data) => <p>{data}</p>}</QueryState>;
        }

        render(<QueryClientProvider client={queryClient}><I18nProvider><Harness/></I18nProvider></QueryClientProvider>);

        expect(await screen.findByRole('heading', {name: 'Netzwerkfehler. Prüfe deine Verbindung.'})).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Erneut versuchen'}));
        expect(await screen.findByText('loaded')).toBeTruthy();
        expect(attempts).toBe(2);
    });

    it('marks cached data while a refresh is in flight', async () => {
        const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});

        function Harness() {
            const query = useQuery({
                queryKey: ['stale-request'],
                queryFn: () => new Promise<string>(() => undefined),
                initialData: 'cached'
            });
            return <QueryState query={query}>{(data) => <p>{data}</p>}</QueryState>;
        }

        render(<QueryClientProvider client={queryClient}><I18nProvider><Harness/></I18nProvider></QueryClientProvider>);

        expect(await screen.findByText('Wird aktualisiert. Die angezeigten Daten können veraltet sein.')).toBeTruthy();
        expect(screen.getByText('cached')).toBeTruthy();
    });
});
