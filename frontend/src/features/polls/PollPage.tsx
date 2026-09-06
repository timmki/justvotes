import type {UseQueryResult} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useEffect, useState} from 'react';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {useCastVoteMutation, frontendError, voteFeedback} from './pollCommands';
import {DataPage, notFoundError} from './pollPageShared';
import {currentOptionNumberFromResults, isResultsUnavailable, pollStateTranslationKey, classifyResultsRelease, type Poll, type PollResults} from './pollProjections';
import {usePollQuery, usePollResultsQuery} from './pollQueries';
import {formatTimestamp} from './pollFormatters';

export function PollPage() {
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = usePollQuery(pollId);
    return <DataPage title={t('polls.detail')}
                     description={t('common.pollDescription')}>
        <QueryState query={query}>{(poll) => poll.visibility === 'public' ? <PollDetail poll={poll}/> :
            <RouteState status="error" error={notFoundError}/>}</QueryState>
    </DataPage>;
}

function PollDetail({poll}: { poll: Poll }) {
    const {t, locale} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const resultsQuery = usePollResultsQuery(poll.id);
    const identity = identityQuery.data?.userID ?? null;
    const currentOptionNumber = currentOptionNumberFromResults(resultsQuery.isError ? undefined : resultsQuery.data, identity);
    const [confirmedOptionNumber, setConfirmedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [selectedOptionNumber, setSelectedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<FrontendError | null>(null);
    const mutation = useCastVoteMutation(poll.id, {
        onMutate: (optionNumber) => {
            setSelectedOptionNumber(optionNumber);
            setFeedback(null);
            setMutationError(null);
            return confirmedOptionNumber;
        },
        onSuccess: (vote) => {
            setConfirmedOptionNumber(vote.optionNumber);
            setSelectedOptionNumber(vote.optionNumber);
            setFeedback(voteFeedback(vote.status, t));
        },
        onError: (cause, _optionNumber, previousOptionNumber) => {
            setSelectedOptionNumber(previousOptionNumber);
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
    const state = classifyResultsRelease({isPending: query.isPending, isError: query.isError, forbiddenBeforeVote});
    if (state === 'checking') return t('polls.resultsChecking');
    if (state === 'requiresVote') return t('polls.resultsAfterVote');
    if (state === 'unavailable') return t('polls.resultsUnavailableState');
    return t('polls.resultsAvailable');
}

function ResultsState({poll, query, forbiddenBeforeVote}: {
    poll: Poll;
    query: UseQueryResult<PollResults, unknown>;
    forbiddenBeforeVote: boolean;
}) {
    const {t} = useI18n();
    if (query.isPending) return <p className="poll-notice" role="status">{t('polls.resultsLoading')}</p>;
    if (forbiddenBeforeVote) return <p className="poll-notice">{t('polls.resultsUnavailable')}</p>;
    if (query.isError) return <RouteState status="error"
                                          error={query.error instanceof ApiError ? query.error.frontend : undefined}
                                          onRetry={() => void query.refetch()}/>;
    return null;
}
