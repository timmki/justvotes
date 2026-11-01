import type {UseQueryResult} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useEffect, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {useCastVoteMutation, frontendError, voteFeedback} from './pollCommands';
import {DataPage, notFoundError} from './pollPageShared';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {currentOptionNumberFromResults, isResultsUnavailable, classifyResultsRelease, type Poll, type PollResults} from './pollProjections';
import {ClosedOptionList, PollClosedNotice} from './PollClosedNotice';
import {usePollQuery, usePollResultsQuery} from './pollQueries';
import {formatTimestamp, formatVoteCount} from './pollFormatters';
import {PollFactLine} from './PollFactLine';
import {PollOptionRow} from './PollOptionRow';
import {useSessionQuery} from '../auth/sessionQueries';

export function PollPage() {
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = usePollQuery(pollId);
    let title = t('polls.detail');
    let meta: ReactNode;
    if (query.data && query.data.visibility === 'public') {
        title = query.data.title;
        meta = <PollFactLine poll={query.data}/>;
    }
    return <DataPage title={title} meta={meta}>
        <QueryState query={query}>{(poll) => {
            if (poll.visibility === 'public') return <PollDetail poll={poll}/>;
            return <RouteState status="error" error={notFoundError}/>;
        }}</QueryState>
    </DataPage>;
}

function PollDetail({poll}: { poll: Poll }) {
    const {t, locale} = useI18n();
    const identity = useSessionQuery().data?.identity ?? null;
    const resultsQuery = usePollResultsQuery(poll.id);
    let results: PollResults | undefined;
    if (!resultsQuery.isError) results = resultsQuery.data;
    const currentOptionNumber = currentOptionNumberFromResults(results, identity);
    const [confirmedOptionNumber, setConfirmedOptionNumber] = useState<number | null>(currentOptionNumber);
    const confirmedRef = useRef<number | null>(currentOptionNumber);
    const [selectedOptionNumber, setSelectedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<FrontendError | null>(null);
    const fieldsetRef = useRef<HTMLFieldSetElement>(null);
    const [voteSettled, setVoteSettled] = useState<'saved' | 'failed' | null>(null);
    const focusInFormOnSubmit = useRef(false);
    const mutation = useCastVoteMutation(poll.id, {
        onMutate: () => {
            setFeedback(null);
            setMutationError(null);
            setVoteSettled(null);
            focusInFormOnSubmit.current = Boolean(fieldsetRef.current?.contains(document.activeElement));
            return confirmedOptionNumber;
        },
        onSuccess: (vote) => {
            confirmedRef.current = vote.optionNumber;
            setConfirmedOptionNumber(vote.optionNumber);
            setSelectedOptionNumber(vote.optionNumber);
            setFeedback(voteFeedback(vote.status, t));
            setVoteSettled('saved');
        },
        onError: (cause) => {
            setMutationError(frontendError(cause));
            setVoteSettled('failed');
            // The poll ended while the page was open: reload it so the page switches to the closed view (spec 009).
            if (cause instanceof ApiError && cause.frontend.code === 'poll-not-active') {
                void queryClient.invalidateQueries({queryKey: queryKeys.poll(poll.id)});
            }
        },
    });

    useEffect(() => {
        if (voteSettled === null) return;
        // A saved vote always moves focus to the voted option (FR-008); a failed vote only returns focus that was in the form.
        if (voteSettled === 'failed' && !focusInFormOnSubmit.current) {
            setVoteSettled(null);
            return;
        }
        // The fieldset is disabled while the mutation is pending, so focus can only move once it is enabled again.
        if (mutation.isPending) return;
        focusInFormOnSubmit.current = false;
        let target: HTMLElement | null | undefined;
        if (voteSettled === 'saved') target = fieldsetRef.current?.querySelector<HTMLInputElement>('input:checked');
        if (voteSettled === 'failed') target = fieldsetRef.current?.querySelector<HTMLButtonElement>('.poll-option-submit');
        target?.focus();
        setVoteSettled(null);
    }, [voteSettled, mutation.isPending]);

    useEffect(() => {
        const previousConfirmed = confirmedRef.current;
        confirmedRef.current = currentOptionNumber;
        setConfirmedOptionNumber(currentOptionNumber);
        setSelectedOptionNumber((selected) => {
            if (selected === null || selected === previousConfirmed) return currentOptionNumber;
            return selected;
        });
    }, [currentOptionNumber]);

    const sortedOptions = [...poll.options].sort((left, right) => left.text.localeCompare(right.text, locale));
    const canVote = poll.visibility === 'public' && poll.state === 'active' && Boolean(identity);
    const resultForbiddenBeforeVote = poll.state === 'active' && isResultsUnavailable(resultsQuery.error);
    const resultsLinkAvailable = Boolean(resultsQuery.data && !resultsQuery.isError && !resultsQuery.isFetching);
    const submitEnabled = canVote && selectedOptionNumber !== null && selectedOptionNumber !== confirmedOptionNumber && !mutation.isPending;

    function selectOption(optionNumber: number) {
        if (optionNumber !== selectedOptionNumber) setMutationError(null);
        setSelectedOptionNumber(optionNumber);
    }

    function submitVote(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitEnabled && selectedOptionNumber !== null) mutation.mutate(selectedOptionNumber);
    }

    const active = poll.state === 'active';
    let resultsError = false;
    if (resultsQuery.isError && !isResultsUnavailable(resultsQuery.error)) resultsError = true;

    return <div className="poll-layout">
        <section className="data-card poll-detail-card">
            {!active && <>
                <PollClosedNotice poll={poll} resultsAvailable={resultsLinkAvailable} resultsPending={resultsQuery.isPending}/>
                {resultsError && <ResultsState poll={poll} query={resultsQuery} forbiddenBeforeVote={false}/>}
                <ClosedOptionList poll={poll} currentOptionNumber={currentOptionNumber}/>
            </>}
            {active && <form className="poll-vote-form-wrapper" onSubmit={submitVote}>
            <fieldset ref={fieldsetRef} className="poll-vote-form" disabled={!canVote || mutation.isPending}>
                <legend>{t('polls.vote')}</legend>
                <div className="poll-option-list">{sortedOptions.map((option) => {
                    const selected = selectedOptionNumber === option.number;
                    let rowError: FrontendError | null = null;
                    if (selected) rowError = mutationError;
                    return <PollOptionRow key={option.number} option={option} name={`poll-${poll.id}`}
                                          selected={selected} current={currentOptionNumber === option.number}
                                          showSubmit={selected && (submitEnabled || mutation.isPending)}
                                          pending={selected && mutation.isPending}
                                          disabled={!canVote || mutation.isPending}
                                          error={rowError}
                                          onSelect={() => selectOption(option.number)}/>;
                })}</div>
            </fieldset>
            </form>}
            {active && <p className="poll-feedback" role="status">{feedback}</p>}
            {active && <ResultsState poll={poll} query={resultsQuery} forbiddenBeforeVote={resultForbiddenBeforeVote}/>}
            <p className="poll-detail-links"><>{active && resultsLinkAvailable && <Link className="text-link"
                to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link>}{active && resultsLinkAvailable && ' | '}<Link className="text-link"
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
