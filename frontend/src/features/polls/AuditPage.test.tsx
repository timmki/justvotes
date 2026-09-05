import '@testing-library/jest-dom/vitest';
import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from '../../shared/api/client';
import {AuditPage} from './AuditPage';
import {renderPollTest, usePollTestLifecycle} from './pollTestSupport';

usePollTestLifecycle();

describe('AuditPage', () => {
    it('renders normalized domain events newest first', async () => {
        vi.spyOn(apiClient, 'getPollAudit').mockResolvedValue([
            {event: 'PollPublished', actor: 'admin', occurredAt: '2026-08-01T10:00:00Z'},
            {event: 'VoteCast', actor: 'alice', occurredAt: '2026-08-01T10:01:00Z'},
        ]);

        renderPollTest('/poll/audit/poll-1', <Routes><Route path="/poll/audit/:pollId" element={<AuditPage/>}/></Routes>);

        expect(await screen.findByRole('heading', {name: 'Stimme abgegeben', level: 3})).toBeVisible();
        expect(screen.getAllByRole('heading', {level: 3}).map((heading) => heading.textContent)).toEqual([
            'Stimme abgegeben', 'Abstimmung veröffentlicht',
        ]);
    });
});
