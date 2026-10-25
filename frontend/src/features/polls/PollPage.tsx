import type {UseQueryResult} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useEffect, useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {IdentityEditor} from '../../shared/ui/IdentityEditor';
import {identityActionKey} from '../../shared/ui/identityActionKey';
import {useMediaQuery} from '../../shared/ui/useMediaQuery';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {useCastVoteMutation, frontendError, voteFeedback} from './pollCommands';
import {DataPage, notFoundError} from './pollPageShared';
import {currentOptionNumberFromResults, isResultsUnavailable, classifyResultsRelease, pollStateTranslationKey, type Poll, type PollResults} from './pollProjections';
import {usePollQuery, usePollResultsQuery} from './pollQueries';
import {formatTimestamp, formatVoteCount} from './pollFormatters';
import {PollFactLine} from './PollFactLine';
import {PollOptionRow} from './PollOptionRow';

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
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const resultsQuery = usePollResultsQuery(poll.id);
    const identity = identityQuery.data?.userID ?? null;
    let results: PollResults | undefined;
    if (!resultsQuery.isError) results = resultsQuery.data;
    const currentOptionNumber = currentOptionNumberFromResults(results, identity);
    const [confirmedOptionNumber, setConfirmedOptionNumber] = useState<number | null>(currentOptionNumber);
    const confirmedRef = useRef<number | null>(currentOptionNumber);
    const [selectedOptionNumber, setSelectedOptionNumber] = useState<number | null>(currentOptionNumber);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<FrontendError | null>(null);
    const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
    const [votesFocusPending, setVotesFocusPending] = useState(false);
    const [identityLeaveDelay, setIdentityLeaveDelay] = useState<number | null>(null);
    const [noticeLeaveDelay, setNoticeLeaveDelay] = useState<number | null>(null);
    const noticeWasShown = useRef(false);
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const noticeButtonRef = useRef<HTMLButtonElement>(null);
    const fieldsetRef = useRef<HTMLFieldSetElement>(null);
    const wasEditorOpen = useRef(false);
    const identitySavedRef = useRef(false);
    const noticeTextId = useId();
    const editorHeadingId = useId();
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

    useEffect(() => {
        if (!identityEditorOpen && wasEditorOpen.current && !identitySavedRef.current) noticeButtonRef.current?.focus();
        identitySavedRef.current = false;
        wasEditorOpen.current = identityEditorOpen;
    }, [identityEditorOpen]);

    useEffect(() => {
        if (identityLeaveDelay === null) return undefined;
        const timer = window.setTimeout(() => {
            setIdentityEditorOpen(false);
            setIdentityLeaveDelay(null);
        }, identityLeaveDelay);
        return () => window.clearTimeout(timer);
    }, [identityLeaveDelay]);

    const sortedOptions = [...poll.options].sort((left, right) => left.text.localeCompare(right.text, locale));
    const canVote = poll.visibility === 'public' && poll.state === 'active' && Boolean(identity) && !identityQuery.isPending && !identityQuery.isError;
    const identityNoticeVisible = poll.state === 'active' && !identityQuery.isPending && !identityQuery.isError && !identity;
    const noticeShown = identityNoticeVisible && !identityEditorOpen;

    useEffect(() => {
        if (noticeShown) {
            noticeWasShown.current = true;
            return undefined;
        }
        if (!noticeWasShown.current) return undefined;
        noticeWasShown.current = false;
        if (identityNoticeVisible) return undefined;
        let leaveDelay = 200;
        if (reducedMotion) leaveDelay = 0;
        setNoticeLeaveDelay(leaveDelay);
        return undefined;
    }, [noticeShown, identityNoticeVisible, reducedMotion]);

    useEffect(() => {
        if (noticeLeaveDelay === null) return undefined;
        const timer = window.setTimeout(() => setNoticeLeaveDelay(null), noticeLeaveDelay);
        return () => window.clearTimeout(timer);
    }, [noticeLeaveDelay]);
    let describedBy: string | undefined;
    if (identityNoticeVisible && !identityEditorOpen) describedBy = noticeTextId;
    if (identityNoticeVisible && identityEditorOpen) describedBy = editorHeadingId;
    const resultForbiddenBeforeVote = poll.state === 'active' && isResultsUnavailable(resultsQuery.error);
    const resultsLinkAvailable = Boolean(resultsQuery.data && !resultsQuery.isError && !resultsQuery.isFetching);
    const submitEnabled = canVote && selectedOptionNumber !== null && selectedOptionNumber !== confirmedOptionNumber && !mutation.isPending;

    useEffect(() => {
        if (!votesFocusPending || !canVote || identityLeaveDelay !== null) return;
        const target = fieldsetRef.current?.querySelector<HTMLInputElement>('input:checked') ?? fieldsetRef.current?.querySelector<HTMLInputElement>('input');
        target?.focus();
        setFeedback(t('polls.identitySavedCanVote'));
        setVotesFocusPending(false);
    }, [votesFocusPending, canVote, identityLeaveDelay, t]);

    function selectOption(optionNumber: number) {
        if (optionNumber !== selectedOptionNumber) setMutationError(null);
        setSelectedOptionNumber(optionNumber);
    }

    function submitVote(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitEnabled && selectedOptionNumber !== null) mutation.mutate(selectedOptionNumber);
    }

    return <div className="poll-layout">
        <section className="data-card poll-detail-card">
            {(noticeShown || noticeLeaveDelay !== null) && <div className={identitySlotClassName(!noticeShown)} inert={!noticeShown} aria-hidden={!noticeShown}>
                <div className="poll-identity-slot-body">
                    <div className="poll-identity-notice">
                        <p id={noticeTextId}>{t('polls.identityRequired')}</p>
                        <button ref={noticeButtonRef} className="primary-button" type="button"
                                onClick={() => setIdentityEditorOpen(true)}>{t(identityActionKey(identity))}</button>
                    </div>
                </div>
            </div>}
            {((identityNoticeVisible && identityEditorOpen) || identityLeaveDelay !== null) && <div className={identitySlotClassName(identityLeaveDelay !== null)} inert={identityLeaveDelay !== null}>
                <div className="poll-identity-slot-body">
                <IdentityEditor identity={identity} startEditing editorHeadingId={editorHeadingId}
                                onSaved={() => {
                                    identitySavedRef.current = true;
                                    setVotesFocusPending(true);
                                    let leaveDelay = 200;
                                    if (reducedMotion) leaveDelay = 0;
                                    setIdentityLeaveDelay(leaveDelay);
                                }}
                                onClose={() => {
                                    if (!identitySavedRef.current) setIdentityEditorOpen(false);
                                }}/>
                </div>
            </div>}
            <form className="poll-vote-form-wrapper" onSubmit={submitVote}>
            <fieldset ref={fieldsetRef} className="poll-vote-form" disabled={!canVote || mutation.isPending} aria-describedby={describedBy}>
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
            </form>
            {identityQuery.isError && <p className="form-error" role="alert">{t('errors.generic')}</p>}
            {poll.state !== 'active' && <p className="poll-notice">{t('polls.voteUnavailable')} ({t(pollStateTranslationKey(poll.state))}{poll.endsAt && `, ${formatTimestamp(poll.endsAt, locale)}`})</p>}
            <p className="poll-feedback" role="status">{feedback}</p>
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

function identitySlotClassName(leaving: boolean) {
    if (leaving) return 'poll-identity-slot leaving';
    return 'poll-identity-slot';
}
