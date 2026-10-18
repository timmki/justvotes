import '@testing-library/jest-dom/vitest';
import {QueryClientProvider} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '../api/client';
import {queryClient} from '../api/queryClient';
import {I18nProvider} from '../i18n/I18nProvider';
import {IdentityEditor} from './IdentityEditor';

afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
});

function renderEditor(onSaved: () => void) {
    return render(<QueryClientProvider client={queryClient}>
        <I18nProvider>
            <IdentityEditor identity={null} startEditing confirmation="inline" onSaved={onSaved}/>
        </I18nProvider>
    </QueryClientProvider>);
}

function requestSaveWithName(name: string) {
    fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: name}});
    fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
}

describe('IdentityEditor onSaved', () => {
    it('calls onSaved once after a successful save', async () => {
        vi.spyOn(apiClient, 'changeIdentity').mockResolvedValue(undefined);
        const onSaved = vi.fn();
        renderEditor(onSaved);

        requestSaveWithName('bob');
        fireEvent.click(await screen.findByRole('button', {name: 'Festlegen'}));

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });

    it('does not call onSaved when the save fails', async () => {
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity').mockRejectedValue(new Error('offline'));
        const onSaved = vi.fn();
        renderEditor(onSaved);

        requestSaveWithName('bob');
        fireEvent.click(await screen.findByRole('button', {name: 'Festlegen'}));

        await waitFor(() => expect(changeIdentity).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Festlegen'})).toBeNull());
        expect(onSaved).not.toHaveBeenCalled();
    });
});
