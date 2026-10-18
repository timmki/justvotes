import type {UseQueryResult} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useEffect, useId, useRef, useState} from 'react';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {IdentityEditor} from '../../shared/ui/IdentityEditor';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {useCastVoteMutation, frontendError, voteFeedback} from './pollCommands';
import {DataPage, notFoundError} from './pollPageShared';
import {currentOptionNumberFromResults, isResultsUnavailable, classifyResultsRelease, pollStateTranslationKey, type Poll, type PollResults} from './pollProjections';
import {usePollQuery, usePollResultsQuery} from './pollQueries';
import {formatTimestamp, formatVoteCount} from './pollFormatters';
import {PollStateBadge} from './PollStateBadge';

export function PollPage() {
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = usePollQuery(pollId);
    let title = t('polls.detail');
    if (query.data && query.data.visibility === 'public') title = query.data.title;
    return <DataPage title={title}
                     description={t('common.pollDescription')}>
        <QueryState query={query}>{(poll) => {
            if (poll.visibility === 'public') return <PollDetail poll={poll}/>;
            return <RouteState status="error" error={notFoundError}/>;
        }}</QueryState>
    </DataPage>;
}

function PollDetail({poll}: { poll: Poll }) {
    const {t, locale} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const resultsQuery = usePollResultsQuery(poll.id);
    const identity = identityQuery.data?.userID ?? null;
    let results: PollResults | undefined;
    if (!resultsQuery.isError) results = resultsQuery.data;
    const currentOptionNumber = currentOptionNumberFromResults(results, identity);
    const [confirmedOptionNumber, setConfirmedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [selectedOptionNumber, setSelectedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<FrontendError | null>(null);
    const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
    const noticeButtonRef = useRef<HTMLButtonElement>(null);
    const wasEditorOpen = useRef(false);
    const noticeTextId = useId();
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

    useEffect(() => {
        if (!identityEditorOpen && wasEditorOpen.current) noticeButtonRef.current?.focus();
        wasEditorOpen.current = identityEditorOpen;
    }, [identityEditorOpen]);

    const sortedOptions = [...poll.options].sort((left, right) => left.text.localeCompare(right.text, locale));
    const canVote = poll.visibility === 'public' && poll.state === 'active' && Boolean(identity) && !identityQuery.isPending && !identityQuery.isError;
    const identityNoticeVisible = poll.state === 'active' && !identityQuery.isPending && !identityQuery.isError && !identity;
    let describedBy: string | undefined;
    if (identityNoticeVisible && !identityEditorOpen) describedBy = noticeTextId;
    const resultForbiddenBeforeVote = poll.state === 'active' && isResultsUnavailable(resultsQuery.error);
    const resultsLinkAvailable = Boolean(resultsQuery.data && !resultsQuery.isError && !resultsQuery.isFetching);

    return <div className="poll-layout">
        <section className="data-card poll-detail-card">
            {identityNoticeVisible && !identityEditorOpen && <div className="poll-identity-notice">
                <p id={noticeTextId}>{t('polls.identityRequired')}</p>
                <button ref={noticeButtonRef} className="primary-button" type="button"
                        onClick={() => setIdentityEditorOpen(true)}>{t('polls.setIdentity')}</button>
            </div>}
            {identityNoticeVisible && identityEditorOpen && <IdentityEditor identity={null} startEditing
                                                                             onClose={() => setIdentityEditorOpen(false)}/>}
            <div className="poll-sheet-heading">
                <p className="poll-detail-date"><time dateTime={poll.createdAt}>{formatTimestamp(poll.createdAt, locale)}</time></p>
                <PollStateBadge state={poll.state}/>
            </div>
            <fieldset className="poll-vote-form" disabled={!canVote || mutation.isPending} aria-describedby={describedBy}>
                <legend>{t('polls.vote')}</legend>
                <div className="poll-option-list">{sortedOptions.map((option) => {
                    const isCurrent = currentOptionNumber === option.number;
                    let className = 'poll-option';
                    if (selectedOptionNumber === option.number) className += ' selected';
                    if (isCurrent) className += ' current';
                    return <label className={className}
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
            {poll.state !== 'active' && <p className="poll-notice">{t('polls.voteUnavailable')} ({t(pollStateTranslationKey(poll.state))}{poll.endsAt && `, ${formatTimestamp(poll.endsAt, locale)}`})</p>}
            {mutationError && <p className="form-error" role="alert">{t(mutationError.messageKey)}</p>}
            {feedback && <p className="poll-feedback" role="status">{feedback}</p>}
            <ResultsState poll={poll} query={resultsQuery} forbiddenBeforeVote={resultForbiddenBeforeVote}/>
            <p className="poll-detail-links"><>{resultsLinkAvailable && <Link className="text-link"
                to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link>}{resultsLinkAvailable && ' | '}<Link className="text-link"
                to={`/poll/audit/${encodeURIComponent(poll.id)}`}>{t('audit.title')}</Link></></p>
        </section>
        <aside className="poll-metadata" aria-label={t('polls.metadata')}>
            <p className="eyebrow">{t('polls.metadata')}</p>
            <dl>
                <div><dt>{t('polls.createdAt')}</dt><dd><time dateTime={poll.createdAt}>{formatTimestamp(poll.createdAt, locale)}</time></dd></div>
                <div><dt>{t('polls.endsAt')}</dt><dd>{poll.endsAt && <time dateTime={poll.endsAt}>{formatTimestamp(poll.endsAt, locale)}</time>}{!poll.endsAt && t('polls.noEndDate')}</dd></div>
                <div><dt>{t('polls.participation')}</dt><dd>{formatVoteCount(poll.totalVotes, locale, t)}</dd></div>
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
    if (query.isError) {
        let error: FrontendError | undefined;
        if (query.error instanceof ApiError) error = query.error.frontend;
        return <RouteState status="error" error={error} onRetry={() => void query.refetch()}/>;
    }
    return null;
}
