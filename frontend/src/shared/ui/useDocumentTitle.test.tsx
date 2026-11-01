import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {useDocumentTitle} from './useDocumentTitle';

function Titled({title}: { title: string }) {
    useDocumentTitle(title);
    return null;
}

describe('useDocumentTitle', () => {
    it('sets the page title with the application name and restores it on unmount', () => {
        const view = render(<Titled title="Konten"/>);
        expect(document.title).toBe('Konten · JustVotes');

        view.rerender(<Titled title="Einladungen"/>);
        expect(document.title).toBe('Einladungen · JustVotes');

        view.unmount();
        expect(document.title).toBe('JustVotes');
    });

    it('does not repeat the application name when the page title equals it', () => {
        render(<Titled title="JustVotes"/>);
        expect(document.title).toBe('JustVotes');
    });
});
