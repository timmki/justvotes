import {QueryClientProvider} from '@tanstack/react-query';
import {cleanup, render} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, vi} from 'vitest';
import {queryClient} from '../../shared/api/queryClient';
import {I18nProvider} from '../../shared/i18n/I18nProvider';

export function usePollTestLifecycle() {
    beforeEach(() => {
        queryClient.clear();
        const values = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            value: {
                clear: () => values.clear(),
                getItem: (key: string) => values.get(key) ?? null,
                setItem: (key: string, value: string) => values.set(key, value),
            },
        });
    });
    afterEach(() => {
        cleanup();
        queryClient.clear();
        window.localStorage.clear();
        vi.restoreAllMocks();
    });
}

export function renderPollTest(initialEntry: string, children: ReactNode) {
    return render(<MemoryRouter initialEntries={[initialEntry]}><QueryClientProvider client={queryClient}>
        <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider></MemoryRouter>);
}
