import {useMutation, useQueries} from '@tanstack/react-query';
import {type FormEvent, useEffect, useState} from 'react';
import type {components} from '../../shared/api/generated/justvotes';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {RouteState} from '../../shared/ui/RouteState';

type AdminVote = components['schemas']['AdminVote'];
type AdminVotePage = components['schemas']['AdminVotePage'];

const PAGE_SIZE = 50;

export function AdminVotes() {
    const {t, locale} = useI18n();
    const [page, setPage] = useState(0);
    const [pollFilter, setPollFilter] = useState('');
    const [selectedVote, setSelectedVote] = useState<AdminVote | null>(null);
    const [removedVoteIds, setRemovedVoteIds] = useState<Set<string>>(() => new Set());
    const [error, setError] = useState<FrontendError | null>(null);
    const firstPageQuery = useApiQuery(queryKeys.adminVotes(0, PAGE_SIZE), () => apiClient.getAdminVotes(0, PAGE_SIZE));
    const pageCount = firstPageQuery.data ? Math.max(1, Math.ceil(firstPageQuery.data.totalElements / PAGE_SIZE)) : 0;
    // The API exposes totals but not aggregate metrics, so load every page before calculating them.
    const remainingPageQueries = useQueries({
        queries: Array.from({length: Math.max(0, pageCount - 1)}, (_, index) => {
            const pageNumber = index + 1;
            return {
                queryKey: queryKeys.adminVotes(pageNumber, PAGE_SIZE),
                queryFn: () => apiClient.getAdminVotes(pageNumber, PAGE_SIZE)
            };
        }),
    });
    const removeMutation = useMutation({
        mutationFn: ({vote, reason}: {
            vote: AdminVote;
            reason: string
        }) => apiClient.removeAdminVote(vote.voteId, reason),
        onSuccess: async (_, {vote}) => {
            setRemovedVoteIds((current) => new Set(current).add(vote.voteId));
            setSelectedVote(null);
            setError(null);
            await Promise.all([
                queryClient.invalidateQueries({queryKey: queryKeys.adminVotesRoot}),
                queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
                queryClient.invalidateQueries({queryKey: queryKeys.poll(vote.poll.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollResults(vote.poll.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollAudit(vote.poll.id)}),
            ]);
        },
        onError: (cause) => setError(frontendError(cause)),
    });

    if (firstPageQuery.isPending) return <RouteState status="loading"/>;
    if (firstPageQuery.isError) return <RouteState status="error" error={frontendError(firstPageQuery.error)}
                                                   onRetry={() => {
                                                       void firstPageQuery.refetch();
                                                   }}/>;
    if (remainingPageQueries.some((query) => query.isPending)) return <RouteState status="loading"/>;
    const additionalError = remainingPageQueries.find((query) => query.isError)?.error;
    if (additionalError) return <RouteState status="error" error={frontendError(additionalError)} onRetry={() => {
        void Promise.all(remainingPageQueries.map((query) => query.refetch()));
    }}/>;
    if (!firstPageQuery.data) return <RouteState status="empty"/>;

    const pages = [firstPageQuery.data, ...remainingPageQueries.map((query) => query.data).filter((data): data is AdminVotePage => data !== undefined)];
    const allVotes = pages.flatMap((entry) => entry.votes).filter((vote) => !removedVoteIds.has(vote.voteId));
    const totalVotes = allVotes.length;
    const affectedPolls = new Set(allVotes.map((vote) => vote.poll.id)).size;
    const identities = new Set(allVotes.map((vote) => vote.userID)).size;
    const pollOptions = Array.from(new Map(allVotes.map((vote) => [vote.poll.id, vote.poll.title])).entries()).sort(([, titleA], [, titleB]) => titleA.localeCompare(titleB, locale));
    const filteredVotes = pollFilter ? allVotes.filter((vote) => vote.poll.id === pollFilter) : allVotes;
    const filteredPageCount = Math.max(1, Math.ceil(filteredVotes.length / PAGE_SIZE));
    const currentPage = Math.min(page, filteredPageCount - 1);
    const visibleVotes = filteredVotes.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    function openRemoval(vote: AdminVote) {
        setError(null);
        removeMutation.reset();
        setSelectedVote(vote);
    }

    function closeRemoval() {
        if (removeMutation.isPending) return;
        setSelectedVote(null);
        setError(null);
    }

    return <section className="admin-panel">
        <h3>{t('admin.votes')}</h3>
        <dl className="vote-stat-grid">
            <div>
                <dt>{t('voteAdmin.currentVotes')}</dt>
                <dd>{totalVotes}</dd>
            </div>
            <div>
                <dt>{t('voteAdmin.affectedPolls')}</dt>
                <dd>{affectedPolls}</dd>
            </div>
            <div>
                <dt>{t('voteAdmin.distinctIdentities')}</dt>
                <dd>{identities}</dd>
            </div>
        </dl>
        <p className="stats-scope">{t('voteAdmin.statsAllPages')}</p>
        <div className="admin-vote-filter"><label htmlFor="admin-vote-poll-filter">{t('voteAdmin.pollFilter')}</label><select id="admin-vote-poll-filter" value={pollFilter} onChange={(event) => { setPollFilter(event.target.value); setPage(0); }}><option value="">{t('voteAdmin.allPolls')}</option>{pollOptions.map(([pollId, title]) => <option key={pollId} value={pollId}>{title}</option>)}</select></div>
        {visibleVotes.length === 0 ? <RouteState status="empty"/> :
            <ul className="admin-vote-list">{visibleVotes.map((vote) => <li className="admin-vote-item"
                                                                            key={vote.voteId}>
                <div className="admin-vote-details">
                    <strong>{vote.poll.title}</strong><span>{vote.option.text}</span><span>{vote.userID}</span>
                    <time dateTime={vote.votedAt}>{formatDate(vote.votedAt, locale)}</time>
                </div>
                <button className="secondary-button destructive-button" type="button" onClick={() => openRemoval(vote)}
                        disabled={removeMutation.isPending}>{t('voteAdmin.removeVote')}</button>
            </li>)}</ul>}
        {filteredPageCount > 1 && <nav className="admin-pagination" aria-label={t('voteAdmin.votePagination')}>
            <button className="text-button" type="button" onClick={() => setPage((current) => current - 1)}
                    disabled={currentPage === 0}>{t('voteAdmin.previousPage')}</button>
            <span>{t('voteAdmin.page')} {currentPage + 1} {t('voteAdmin.of')} {filteredPageCount}</span>
            <button className="text-button" type="button" onClick={() => setPage((current) => current + 1)}
                    disabled={currentPage >= filteredPageCount - 1}>{t('voteAdmin.nextPage')}</button>
        </nav>}
        {selectedVote && <VoteRemovalDialog vote={selectedVote} error={error} pending={removeMutation.isPending}
                                            onCancel={closeRemoval} onConfirm={(reason) => removeMutation.mutate({
            vote: selectedVote,
            reason
        })}/>}
    </section>;
}

function VoteRemovalDialog({vote, error, pending, onCancel, onConfirm}: {
    vote: AdminVote;
    error: FrontendError | null;
    pending: boolean;
    onCancel: () => void;
    onConfirm: (reason: string) => void
}) {
    const {t} = useI18n();
    const [reason, setReason] = useState('');
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        document.getElementById('admin-vote-removal-reason')?.focus();
    }, []);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        onConfirm(trimmed);
    }

    return <div className="modal-backdrop">
        <div className="identity-dialog admin-vote-dialog" role="dialog" aria-modal="true"
             aria-labelledby="admin-vote-removal-heading" aria-describedby="admin-vote-removal-warning">
            <h3 id="admin-vote-removal-heading">{t('voteAdmin.removeVoteTitle')}</h3>
            <p id="admin-vote-removal-warning">{vote.poll.title}: {vote.option.text} ({vote.userID})</p>
            <p>{t('voteAdmin.removeVoteWarning')}</p>
            <form className="catalog-form" onSubmit={submit}>
                <label htmlFor="admin-vote-removal-reason">{t('voteAdmin.removalReason')}</label>
                <textarea id="admin-vote-removal-reason" rows={4} required value={reason} onChange={(event) => {
                    setReason(event.target.value);
                    setInvalid(false);
                }}/>
                {invalid && <p className="form-error" role="alert">{t('voteAdmin.removalReasonRequired')}</p>}
                {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
                <div className="identity-actions">
                    <button className="primary-button" type="submit"
                            disabled={pending || !reason.trim()}>{t('voteAdmin.removeVote')}</button>
                    <button className="text-button" type="button" onClick={onCancel}
                            disabled={pending}>{t('forms.cancel')}</button>
                </div>
            </form>
        </div>
    </div>;
}

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}

function frontendError(cause: unknown): FrontendError {
    return cause instanceof ApiError ? cause.frontend : {
        kind: 'problem',
        status: null,
        code: 'unexpected_error',
        detail: null,
        retryable: false,
        messageKey: 'errors.generic'
    };
}
