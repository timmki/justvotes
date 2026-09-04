import {type UseQueryResult, useMutation} from '@tanstack/react-query';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useEffect, useState, type ReactNode} from 'react';
import type {components} from '../../shared/api/generated/justvotes';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {Locale, TranslationKey} from '../../shared/i18n/translations';
import {PageFrame} from '../../shared/ui/PageFrame';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {PublicPollCard} from './PublicPollCard';

export function PollsPage() {
    const {t} = useI18n();
    const query = useApiQuery(queryKeys.publicPolls, () => apiClient.getPublicPolls());
    return <DataPage eyebrow={t('common.publicArea')} title={t('polls.list')} description={t('common.publicArea')}>
        <QueryState query={query}>{(polls) => <>
            <p className="poll-list-status" role="status" aria-live="polite">{polls.length} {t(polls.length === 1 ? 'polls.listCountSingular' : 'polls.listCount')}</p>
            {polls.length === 0 ? <RouteState status="empty"/> : <ul className="poll-list">
                {polls.map((poll) => <li key={poll.id}><PublicPollCard poll={poll}/></li>)}
            </ul>}
        </>}</QueryState>
    </DataPage>;
}

export function PollPage() {
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = useApiQuery(queryKeys.poll(pollId), () => apiClient.getPoll(pollId));
    return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('polls.detail')}
                     description={t('common.pollDescription')}>
        <QueryState query={query}>{(poll) => poll.visibility === 'public' ? <PollDetail poll={poll}/> :
            <RouteState status="error" error={notFoundError}/>}</QueryState>
    </DataPage>;
}

type Poll = components['schemas']['Poll'];
type PollResults = components['schemas']['PollResults'];
type AuditEntry = components['schemas']['AuditEntry'];
type AuditEventType = components['schemas']['AuditEventType'];
type VoteAuditEventType = components['schemas']['VoteAuditEventType'];
type Vote = components['schemas']['Vote'];

function PollDetail({poll}: { poll: Poll }) {
    const {t, locale} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const resultsQuery = useApiQuery(queryKeys.pollResults(poll.id), () => apiClient.getPollResults(poll.id));
    const identity = identityQuery.data?.userID ?? null;
    const currentOptionNumber = currentOptionNumberFromResults(resultsQuery.isError ? undefined : resultsQuery.data, identity);
    const [confirmedOptionNumber, setConfirmedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [selectedOptionNumber, setSelectedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<FrontendError | null>(null);
    const mutation = useMutation<Vote, unknown, number, number | null>({
        mutationFn: (optionNumber) => apiClient.castVote(poll.id, optionNumber),
        onMutate: (optionNumber) => {
            setSelectedOptionNumber(optionNumber);
            setFeedback(null);
            setMutationError(null);
            return confirmedOptionNumber;
        },
        onSuccess: async (vote) => {
            setConfirmedOptionNumber(vote.optionNumber);
            setSelectedOptionNumber(vote.optionNumber);
            setFeedback(voteFeedback(vote.status, t));
            await Promise.all([
                queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
                queryClient.invalidateQueries({queryKey: queryKeys.poll(poll.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollResults(poll.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollAudit(poll.id)}),
            ]);
        },
        onError: (cause, _optionNumber, previousOptionNumber) => {
            setSelectedOptionNumber(previousOptionNumber ?? null);
            setMutationError(frontendError(cause));
        },
    });

    useEffect(() => {
        if (!mutation.isPending) {
            setConfirmedOptionNumber(currentOptionNumber);
            setSelectedOptionNumber(currentOptionNumber);
        }
    }, [currentOptionNumber, mutation.isPending]);

    const sortedOptions = [...poll.options].sort((left, right) => left.text.localeCompare(right.text, locale));
    const canVote = poll.visibility === 'public' && poll.state === 'active' && Boolean(identity) && !identityQuery.isPending && !identityQuery.isError;
    const resultForbiddenBeforeVote = poll.state === 'active' && isResultsUnavailable(resultsQuery.error);
    const resultsLinkAvailable = Boolean(resultsQuery.data && !resultsQuery.isError && !resultsQuery.isFetching);

    return <div className="poll-layout">
        <section className="data-card poll-detail-card">
            <div className="poll-sheet-heading">
                <div><p className="poll-detail-date"><time dateTime={poll.createdAt}>{formatTimestamp(poll.createdAt, locale)}</time></p>
                    <h3>{poll.title}</h3></div>
                <span className="poll-state">{t(pollStateTranslationKey(poll.state))}</span>
            </div>
            <fieldset className="poll-vote-form" disabled={!canVote || mutation.isPending}>
                <legend>{t('polls.vote')}</legend>
                <div className="poll-option-list">{sortedOptions.map((option) => {
                    const isCurrent = currentOptionNumber === option.number;
                    return <label className={`poll-option${selectedOptionNumber === option.number ? ' selected' : ''}${isCurrent ? ' current' : ''}`}
                                  key={option.number}>
                        <input type="radio" name={`poll-${poll.id}`} value={option.number}
                               aria-label={option.text} checked={selectedOptionNumber === option.number}
                               onChange={() => mutation.mutate(option.number)}
                               onClick={() => {
                                   if (selectedOptionNumber === option.number) mutation.mutate(option.number);
                               }}/>
                        <span><strong>{option.text}</strong><small>{t('polls.optionNumber')} {option.number}{isCurrent && ` · ${t('polls.yourVote')}`}</small></span>
                    </label>;
                })}</div>
            </fieldset>
            {identityQuery.isError && <p className="form-error" role="alert">{t('errors.generic')}</p>}
            {!identityQuery.isPending && !identityQuery.isError && !identity && <p className="poll-notice">{t('polls.identityRequired')}</p>}
            {poll.state !== 'active' && <p className="poll-notice">{t('polls.voteUnavailable')} ({t(pollStateTranslationKey(poll.state))}{poll.endsAt && `, ${formatTimestamp(poll.endsAt, locale)}`})</p>}
            {mutationError && <p className="form-error" role="alert">{t(mutationError.messageKey)}</p>}
            {feedback && <p className="poll-feedback" role="status">{feedback}</p>}
            <ResultsState poll={poll} query={resultsQuery} forbiddenBeforeVote={resultForbiddenBeforeVote}/>
            <p className="poll-detail-links"><>{resultsLinkAvailable && <Link
                to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link>}{resultsLinkAvailable && ' | '}<Link
                to={`/poll/audit/${encodeURIComponent(poll.id)}`}>{t('audit.title')}</Link></></p>
        </section>
        <aside className="poll-metadata" aria-label={t('polls.metadata')}>
            <p className="eyebrow">{t('polls.metadata')}</p>
            <h3>{t('polls.detail')}</h3>
            <dl>
                <div><dt>{t('polls.createdAt')}</dt><dd><time dateTime={poll.createdAt}>{formatTimestamp(poll.createdAt, locale)}</time></dd></div>
                <div><dt>{t('polls.duration')}</dt><dd>{poll.endsAt ? <time dateTime={poll.endsAt}>{formatTimestamp(poll.endsAt, locale)}</time> : t('polls.noEndDate')}</dd></div>
                <div><dt>{t('polls.participation')}</dt><dd>{poll.totalVotes} {t('polls.votes')}</dd></div>
                <div><dt>{t('polls.resultsRelease')}</dt><dd>{resultReleaseState(resultsQuery, resultForbiddenBeforeVote, t)}</dd></div>
            </dl>
            <p>{t('polls.pseudonymousResults')}</p>
        </aside>
    </div>;
}

function resultReleaseState(query: UseQueryResult<PollResults, unknown>, forbiddenBeforeVote: boolean,
                            t: (key: TranslationKey) => string) {
    if (query.isPending) return t('polls.resultsChecking');
    if (forbiddenBeforeVote) return t('polls.resultsAfterVote');
    if (query.isError) return t('polls.resultsUnavailableState');
    return t('polls.resultsAvailable');
}

function pollStateTranslationKey(state: Poll['state']): TranslationKey {
    const keys: Record<Poll['state'], TranslationKey> = {
        draft: 'admin.stateDraft',
        active: 'admin.stateActive',
        expired: 'admin.stateExpired',
        archived: 'admin.stateArchived',
        deleted: 'admin.stateDeleted',
    };
    return keys[state];
}

function ResultsState({poll, query, forbiddenBeforeVote}: {
    poll: Poll;
    query: UseQueryResult<PollResults, unknown>;
    forbiddenBeforeVote: boolean
}) {
    const {t} = useI18n();
    if (query.isPending) return <p className="poll-notice" role="status">{t('polls.resultsLoading')}</p>;
    if (forbiddenBeforeVote) return <p className="poll-notice">{t('polls.resultsUnavailable')}</p>;
    if (query.isError) return <RouteState status="error"
                                          error={query.error instanceof ApiError ? query.error.frontend : undefined}
                                          onRetry={() => void query.refetch()}/>;
    if (poll.state === 'active' && query.isFetching) return <p className="stale-state" role="status">{t('common.refreshing')}</p>;
    return null;
}

function currentOptionNumberFromResults(results: PollResults | undefined, identity: string | null) {
    if (!results || !identity) return null;
    return results.options.find((option) => option.votes.some((vote) => vote.userID === identity))?.number ?? null;
}

function isResultsUnavailable(error: unknown) {
    return error instanceof ApiError && error.frontend.status === 403 && error.frontend.code === 'results-not-available';
}

function frontendError(cause: unknown) {
    return cause instanceof ApiError ? cause.frontend : {
        kind: 'network' as const,
        status: null,
        code: 'unknown_error',
        detail: null,
        retryable: false,
        messageKey: 'errors.generic' as const,
    };
}

const notFoundError: FrontendError = {
    kind: 'problem',
    status: 404,
    code: 'not_found',
    detail: null,
    retryable: false,
    messageKey: 'errors.notFound',
};

function voteFeedback(status: Vote['status'], t: (key: TranslationKey) => string) {
    switch (status) {
        case 'created':
            return t('polls.voteCreated');
        case 'replaced':
            return t('polls.voteReplaced');
        case 'unchanged':
            return t('polls.voteUnchanged');
    }
}

export function ResultsPage() {
    const {t, locale} = useI18n();
    const {pollId = ''} = useParams();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const query = usePollingResultsQuery(pollId);
    return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('polls.results')}
                     description={t('common.resultsDescription')}>
        <QueryState query={query}>{(results) => <ResultsDetail results={results}
                                                                   identity={identityQuery.data?.userID ?? null}
                                                                   locale={locale}/>}</QueryState>
    </DataPage>;
}

export function OptionPage() {
    const {t, locale} = useI18n();
    const {pollId = '', optionNumber = ''} = useParams();
    const query = usePollingResultsQuery(pollId);
    return <DataPage eyebrow={`${t('common.optionLabel')} ${optionNumber}`} title={t('polls.option')}
                     description={t('common.optionDescription')}>
        <QueryState query={query}>{(results) => {
            const option = results.options.find((candidate) => String(candidate.number) === optionNumber);
            return option ? <OptionDetail results={results} option={option} locale={locale}/> : <RouteState status="empty"/>;
        }}</QueryState>
    </DataPage>;
}

function usePollingResultsQuery(pollId: string) {
    const [isVisible, setIsVisible] = useState(() => document.visibilityState !== 'hidden');
    const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
    const query = useApiQuery(queryKeys.pollResults(pollId), () => apiClient.getPollResults(pollId), {
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

function ResultsDetail({results, identity, locale}: { results: PollResults; identity: string | null; locale: Locale }) {
    const {t} = useI18n();
    const navigate = useNavigate();
    const currentOptionNumber = currentOptionNumberFromResults(results, identity);
    const [withdrawalError, setWithdrawalError] = useState<FrontendError | null>(null);
    const withdrawal = useMutation<void, unknown, void>({
        mutationFn: () => apiClient.withdrawVote(results.id),
        onMutate: () => setWithdrawalError(null),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
                queryClient.invalidateQueries({queryKey: queryKeys.poll(results.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollResults(results.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollAudit(results.id)}),
            ]);
            navigate(`/poll/${encodeURIComponent(results.id)}`);
        },
        onError: (cause) => setWithdrawalError(frontendError(cause)),
    });
    const orderedOptions = orderedResultOptions(results.options, locale, results.totalVotes);
    const winnerOptions = orderedOptions.filter((option) => isWinner(option, results.options, results.totalVotes));
    const winnerCount = winnerOptions.length;
    const winnerLabel = winnerCount > 1 ? t('polls.tie') : t('polls.winner');
    const highestVoteCount = Math.max(0, ...results.options.map((option) => option.voteCount));
    const highestPercentage = results.totalVotes === 0 ? 0 : Math.round(highestVoteCount / results.totalVotes * 100);

    return <div className="result-layout">
        <section className="data-card results-card" aria-label={t('polls.resultSheet')}>
            <div className="results-heading"><div><p className="results-date"><time dateTime={results.createdAt}>{formatTimestamp(results.createdAt, locale)}</time></p>
                <h3>{results.title}</h3></div><span className="poll-state">{t(pollStateTranslationKey(results.state))}</span></div>
            <dl className="result-summary">
                <div><dt>{t('polls.totalVotes')}</dt><dd>{results.totalVotes}</dd></div>
                <div><dt>{t('polls.highestShare')}</dt><dd>{highestPercentage} %</dd></div>
            </dl>
            <ol className="result-list">{orderedOptions.map((option) => {
                const percentage = results.totalVotes === 0 ? 0 : Math.round(option.voteCount / results.totalVotes * 100);
                const current = currentOptionNumber === option.number;
                return <li className={`result-option${isWinner(option, results.options, results.totalVotes) ? ' winner' : ''}${current ? ' current' : ''}`} key={option.number}>
                    <div className="result-option-heading"><Link to={`/poll/results/${encodeURIComponent(results.id)}/option/${option.number}`}>{option.text}</Link>
                        {isWinner(option, results.options, results.totalVotes) && <strong>{winnerLabel}</strong>}</div>
                    <div className="result-option-progress" aria-hidden="true"><span style={{width: `${percentage}%`}}/></div>
                    <div className="result-option-meta"><span>{percentage} %</span><span>{option.voteCount} {t('polls.votes')}</span></div>
                    {current && <small>{t('polls.yourVote')}</small>}
                </li>;
            })}</ol>
            {withdrawalError && <p className="form-error" role="alert">{t(withdrawalError.messageKey)}</p>}
            {results.state === 'active' && currentOptionNumber !== null && <button className="text-button" type="button"
                                                                                disabled={withdrawal.isPending}
                                                                                onClick={() => {
                                                                                    if (window.confirm(t('polls.confirmWithdrawal'))) withdrawal.mutate();
                                                                                }}>{withdrawal.isPending ? t('polls.withdrawing') : t('polls.withdraw')}</button>}
            <p className="poll-detail-links"><Link to={`/poll/${encodeURIComponent(results.id)}`}>{t('common.polls')}</Link> | <Link
                to={`/poll/audit/${encodeURIComponent(results.id)}`}>{t('audit.title')}</Link></p>
        </section>
        <aside className="result-leader-panel" aria-label={t('polls.currentLeader')}>
            <p className="eyebrow">{t('polls.currentLeader')}</p>
            {winnerOptions.length === 0 ? <h3>{t('polls.noWinner')}</h3> : <>
                <p className="result-leader-label">{winnerLabel}</p>
                <h3>{winnerOptions.map((option) => option.text).join(', ')}</h3>
            </>}
            <dl>
                <div><dt>{t('polls.highestShare')}</dt><dd>{highestPercentage} %</dd></div>
                <div><dt>{t('polls.endsAt')}</dt><dd>{results.endsAt ? <time dateTime={results.endsAt}>{formatTimestamp(results.endsAt, locale)}</time> : t('polls.noEndDate')}</dd></div>
            </dl>
        </aside>
    </div>;
}

function OptionDetail({results, option, locale}: { results: PollResults; option: PollResults['options'][number]; locale: Locale }) {
    const {t} = useI18n();
    return <div className="result-layout option-layout">
        <section className="data-card option-detail" aria-label={t('polls.optionOverview')}>
            <div className="option-detail-heading"><div><p className="option-poll-title">{results.title}</p><h3>{option.text}</h3></div>
                <span className="poll-state">{t(pollStateTranslationKey(results.state))}</span></div>
            <dl className="option-summary">
                <div><dt>{t('polls.optionNumber')}</dt><dd>{option.number}</dd></div>
                <div><dt>{t('polls.votes')}</dt><dd>{option.voteCount}</dd></div>
            </dl>
            <div className="option-voters"><p className="eyebrow">{t('polls.voters')}</p>
                {option.votes.length === 0 ? <div className="option-empty-state"><p>{t('polls.noOptionVotes')}</p><RouteState status="empty"/></div> : <ol className="voter-list" aria-label={t('polls.voters')}>
                    {option.votes.map((vote, index) => <li key={`${vote.userID}-${vote.votedAt}`}><span className="voter-number">{index + 1}</span>
                        <span className="voter-identity">{vote.userID}</span><time dateTime={vote.votedAt}>{formatTimestamp(vote.votedAt, locale)}</time></li>)}
                </ol>}
            </div>
            <p className="poll-detail-links"><Link to={`/poll/results/${encodeURIComponent(results.id)}`}>{t('polls.results')}</Link> | <Link
                to={`/poll/audit/${encodeURIComponent(results.id)}`}>{t('audit.title')}</Link></p>
        </section>
        <aside className="option-context-panel" aria-label={t('polls.optionContext')}>
            <p className="eyebrow">{t('polls.optionContext')}</p>
            <h3>{results.title}</h3>
            <p>{t('polls.pseudonymousResults')}</p>
            <dl>
                <div><dt>{t('polls.optionNumber')}</dt><dd>{option.number}</dd></div>
                <div><dt>{t('polls.state')}</dt><dd>{t(pollStateTranslationKey(results.state))}</dd></div>
                <div><dt>{t('polls.createdAt')}</dt><dd><time dateTime={results.createdAt}>{formatTimestamp(results.createdAt, locale)}</time></dd></div>
                <div><dt>{t('polls.duration')}</dt><dd>{results.endsAt ? <time dateTime={results.endsAt}>{formatTimestamp(results.endsAt, locale)}</time> : t('polls.noEndDate')}</dd></div>
            </dl>
        </aside>
    </div>;
}

function orderedResultOptions(options: PollResults['options'], locale: Locale, totalVotes: number) {
    return [...options].sort((left, right) => {
        const leftWinner = isWinner(left, options, totalVotes);
        const rightWinner = isWinner(right, options, totalVotes);
        if (leftWinner !== rightWinner) return leftWinner ? -1 : 1;
        return left.text.localeCompare(right.text, locale);
    });
}

function isWinner(option: PollResults['options'][number], options: PollResults['options'], totalVotes: number) {
    const maximum = Math.max(0, ...options.map((candidate) => candidate.voteCount));
    return totalVotes > 0 && maximum > 0 && option.voteCount === maximum;
}

export function AuditPage() {
    const {t, locale} = useI18n();
    const {pollId = ''} = useParams();
    const query = useApiQuery(queryKeys.pollAudit(pollId), () => apiClient.getPollAudit(pollId));
    return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('audit.title')}
                     description={t('common.auditDescription')}>
        <QueryState query={query}>{(entries) => entries.length === 0 ? <RouteState status="empty"/> :
            <ol className="audit-timeline" aria-label={t('audit.timeline')}>{entries.map((entry, index) => {
                const optionLabel = auditOptionLabel(entry, t);
                return <li className="audit-entry" key={`${entry.occurredAt}-${entry.event}-${index}`}><article>
                <div className="audit-entry-heading"><h3>{auditEventLabel(entry.event, t)}</h3></div>
                <dl className="audit-entry-meta"><div><dt>{t('audit.actor')}</dt><dd>{entry.actor}</dd></div><div><dt>{t('audit.occurredAt')}</dt><dd>
                    <time dateTime={entry.occurredAt}>{formatTimestamp(entry.occurredAt, locale)}</time></dd></div></dl>
                {optionLabel && <p className="audit-entry-detail"><strong>{t('audit.option')}:</strong> {optionLabel}</p>}
                {entry.userID && <p className="audit-entry-detail"><strong>{t('audit.identity')}:</strong> {entry.userID}</p>}
                {entry.reason && <p className="audit-entry-detail"><strong>{t('audit.reason')}:</strong> {entry.reason}</p>}
                {entry.votedAt && <p className="audit-entry-detail"><strong>{t('audit.votedAt')}:</strong> <time dateTime={entry.votedAt}>
                    {formatTimestamp(entry.votedAt, locale)}</time></p>}
            </article></li>;
            })}</ol>}</QueryState>
        <p className="poll-detail-links"><Link to={`/poll/${encodeURIComponent(pollId)}`}>{t('common.polls')}</Link> | <Link
            to={`/poll/results/${encodeURIComponent(pollId)}`}>{t('polls.results')}</Link></p>
    </DataPage>;
}

const auditEventTranslationKeys: Record<AuditEventType, TranslationKey> = {
    PollPublished: 'audit.pollPublished',
    PollExpired: 'audit.pollExpired',
    PollArchived: 'audit.pollArchived',
    PollRestoredFromArchive: 'audit.pollRestoredFromArchive',
    PollExpiryChanged: 'audit.pollExpiryChanged',
    PollReopened: 'audit.pollReopened',
    PollSoftDeleted: 'audit.pollSoftDeleted',
    PollRestored: 'audit.pollRestored',
    VoteCast: 'audit.voteCast',
    VoteReplaced: 'audit.voteReplaced',
    VoteWithdrawn: 'audit.voteWithdrawn',
    VoteRemovedForIdentityChange: 'audit.voteRemovedForIdentityChange',
    VoteRemovedByAdmin: 'audit.voteRemovedByAdmin',
};

function auditEventLabel(event: AuditEntry['event'], t: (key: TranslationKey) => string) {
    if (!Object.prototype.hasOwnProperty.call(auditEventTranslationKeys, event)) return t('audit.unknownEvent');
    return t(auditEventTranslationKeys[event as AuditEventType]);
}

function auditOptionLabel(entry: AuditEntry, t: (key: TranslationKey) => string) {
    if (!voteAuditEvents.has(entry.event)) return null;
    if (entry.selection) return entry.selection;
    return entry.optionNumber == null ? null : `${t('audit.optionNumber')} ${entry.optionNumber}`;
}

const voteAuditEvents: ReadonlySet<AuditEventType> = new Set<VoteAuditEventType>([
    'VoteCast',
    'VoteReplaced',
    'VoteWithdrawn',
    'VoteRemovedForIdentityChange',
    'VoteRemovedByAdmin',
]);

function DataPage({eyebrow, title, description, children}: {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode
}) {
    return <PageFrame eyebrow={eyebrow} title={title} description={description}>{children}</PageFrame>;
}

function formatTimestamp(value: string, locale: Locale) {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}
