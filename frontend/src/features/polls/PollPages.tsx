import {type UseQueryResult, useMutation} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode} from 'react';
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

export function PollsPage() {
    const {t, locale} = useI18n();
    const query = useApiQuery(queryKeys.publicPolls, () => apiClient.getPublicPolls());
    return <DataPage eyebrow={t('common.publicArea')} title={t('polls.list')} description={t('common.publicArea')}>
        <QueryState query={query}>{(polls) => polls.length === 0 ? <RouteState status="empty"/> :
            <ul className="poll-list">{polls.map((poll) => <li key={poll.id}><Link className="poll-card"
                                                                                   to={`/poll/${encodeURIComponent(poll.id)}`}
                                                                                   onKeyDown={activateOnKeyDown}
                                                                                   onKeyUp={activateOnSpaceUp}>
                <span className="poll-card-heading"><strong>{poll.title}</strong><span className="poll-vote-badge"
                                                                                       aria-label={`${poll.totalVotes} ${t('polls.votes')}`}>{poll.totalVotes}</span></span>
                <span className="poll-card-meta"><span>{t('polls.createdBy')} {t('common.admin')}</span><time
                    dateTime={poll.createdAt}>{formatCreatedAt(poll.createdAt, locale)}</time><span
                    className="poll-id">{poll.id}</span></span>
            </Link></li>)}</ul>}</QueryState>
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
type Vote = components['schemas']['Vote'];

function PollDetail({poll}: { poll: Poll }) {
    const {t, locale} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const resultsQuery = useApiQuery(queryKeys.pollResults(poll.id), () => apiClient.getPollResults(poll.id));
    const identity = identityQuery.data?.userID ?? null;
    const currentOptionNumber = currentOptionNumberFromResults(resultsQuery.data, identity);
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

    return <section className="data-card poll-detail-card"><div className="poll-detail-heading"><h3>{poll.title}</h3>
        <span className="poll-state">{t(pollStateTranslationKey(poll.state))}</span></div>
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
                    <span><strong>{option.text}</strong>{isCurrent && <small>{t('polls.yourVote')}</small>}</span>
                </label>;
            })}</div>
        </fieldset>
        {identityQuery.isError && <p className="form-error" role="alert">{t('errors.generic')}</p>}
        {!identityQuery.isPending && !identityQuery.isError && !identity && <p className="poll-notice">{t('polls.identityRequired')}</p>}
        {poll.state !== 'active' && <p className="poll-notice">{t('polls.votingClosed')} ({t(pollStateTranslationKey(poll.state))}{poll.endsAt && `, ${formatCreatedAt(poll.endsAt, locale)}`})</p>}
        {mutationError && <p className="form-error" role="alert">{t(mutationError.messageKey)}</p>}
        {feedback && <p className="poll-feedback" role="status">{feedback}</p>}
        <ResultsState poll={poll} query={resultsQuery} forbiddenBeforeVote={resultForbiddenBeforeVote}/>
        <p className="poll-detail-links"><>{resultsQuery.data && !resultsQuery.isError && !resultsQuery.isFetching && <Link
            to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link>}{resultsQuery.data && !resultsQuery.isError && !resultsQuery.isFetching && ' | '}<Link
            to={`/poll/audit/${encodeURIComponent(poll.id)}`}>{t('audit.title')}</Link></></p>
    </section>;
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
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = useApiQuery(queryKeys.pollResults(pollId), () => apiClient.getPollResults(pollId));
    return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('polls.results')}
                     description={t('common.resultsDescription')}>
        <QueryState query={query}>{(results) => <section className="data-card"><h3>{results.title}</h3>
            <ul className="data-list">{results.options.map((option) => <li key={option.number}><Link
                to={`/poll/results/${encodeURIComponent(results.id)}/option/${option.number}`}>{option.text}</Link><span> {option.voteCount}</span>
            </li>)}</ul>
        </section>}</QueryState>
    </DataPage>;
}

export function OptionPage() {
    const {t} = useI18n();
    const {pollId = '', optionNumber = ''} = useParams();
    const query = useApiQuery(queryKeys.pollResults(pollId), () => apiClient.getPollResults(pollId));
    return <DataPage eyebrow={`${t('common.optionLabel')} ${optionNumber}`} title={t('polls.option')}
                     description={t('common.optionDescription')}>
        <QueryState query={query}>{(results) => {
            const option = results.options.find((candidate) => String(candidate.number) === optionNumber);
            return option ? <section className="data-card"><h3>{option.text}</h3>
                <ul className="data-list">{option.votes.map((vote) => <li
                    key={`${vote.userID}-${vote.votedAt}`}>{vote.userID}</li>)}</ul>
            </section> : <RouteState status="empty"/>;
        }}</QueryState>
    </DataPage>;
}

export function AuditPage() {
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = useApiQuery(queryKeys.pollAudit(pollId), () => apiClient.getPollAudit(pollId));
    return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('audit.title')}
                     description={t('common.auditDescription')}>
        <QueryState query={query}>{(entries) => entries.length === 0 ? <RouteState status="empty"/> :
            <ol className="data-list">{entries.map((entry, index) => <li
                key={`${entry.occurredAt}-${index}`}>{entry.event}</li>)}</ol>}</QueryState>
    </DataPage>;
}

function DataPage({eyebrow, title, description, children}: {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode
}) {
    return <PageFrame eyebrow={eyebrow} title={title} description={description}>{children}</PageFrame>;
}

function formatCreatedAt(value: string, locale: Locale) {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}

function activateOnKeyDown(event: ReactKeyboardEvent<HTMLAnchorElement>) {
    if (event.key === ' ') event.preventDefault();
    if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.click();
    }
}

function activateOnSpaceUp(event: ReactKeyboardEvent<HTMLAnchorElement>) {
    if (event.key === ' ') {
        event.preventDefault();
        event.currentTarget.click();
    }
}
