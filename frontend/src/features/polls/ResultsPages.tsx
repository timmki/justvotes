import {Link, useNavigate, useParams} from 'react-router-dom';
import {useState} from 'react';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {apiClient} from '../../shared/api/client';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {useWithdrawVoteMutation, frontendError} from './pollCommands';
import {DataPage} from './pollPageShared';
import {formatTimestamp} from './pollFormatters';
import {isWinner, percentage, pollStateTranslationKey, projectPollResults, type PollResults} from './pollProjections';
import {usePollingResultsQuery} from './usePollingResultsQuery';

export function ResultsPage() {
    const {t, locale} = useI18n();
    const {pollId = ''} = useParams();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const query = usePollingResultsQuery(pollId);
    return <DataPage title={t('polls.results')}
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
    return <DataPage title={t('polls.option')}
                     description={t('common.optionDescription')}>
        <QueryState query={query}>{(results) => {
            const projected = projectPollResults(results, null, locale);
            const option = projected.results.options.find((candidate) => String(candidate.number) === optionNumber);
            return option ? <OptionDetail results={projected.results} option={option} locale={locale}/> : <RouteState status="empty"/>;
        }}</QueryState>
    </DataPage>;
}

function ResultsDetail({results, identity, locale}: { results: PollResults; identity: string | null; locale: 'de' | 'en' }) {
    const {t} = useI18n();
    const navigate = useNavigate();
    const projection = projectPollResults(results, identity, locale);
    const [withdrawalError, setWithdrawalError] = useState<ReturnType<typeof frontendError> | null>(null);
    const withdrawal = useWithdrawVoteMutation(results.id, {
        onMutate: () => setWithdrawalError(null),
        onSuccess: () => navigate(`/poll/${encodeURIComponent(results.id)}`),
        onError: (cause) => setWithdrawalError(frontendError(cause)),
    });
    const winnerLabel = projection.winnerOptions.length > 1 ? t('polls.tie') : t('polls.winner');

    return <div className="result-layout">
        <section className="data-card results-card" aria-label={t('polls.resultSheet')}>
            <div className="results-heading"><div><p className="results-date"><time dateTime={results.createdAt}>{formatTimestamp(results.createdAt, locale)}</time></p>
                <h3>{results.title}</h3></div><span className="poll-state">{t(pollStateTranslationKey(results.state))}</span></div>
            <dl className="result-summary">
                <div><dt>{t('polls.totalVotes')}</dt><dd>{results.totalVotes}</dd></div>
                <div><dt>{t('polls.highestShare')}</dt><dd>{projection.highestPercentage} %</dd></div>
            </dl>
            <ol className="result-list">{projection.orderedOptions.map((option) => {
                const optionPercentage = percentage(option.voteCount, results.totalVotes);
                const current = projection.currentOptionNumber === option.number;
                return <li className={`result-option${isWinner(option, results.options, results.totalVotes) ? ' winner' : ''}${current ? ' current' : ''}`} key={option.number}>
                    <div className="result-option-heading"><Link to={`/poll/results/${encodeURIComponent(results.id)}/option/${option.number}`}>{option.text}</Link>
                        {isWinner(option, results.options, results.totalVotes) && <strong>{winnerLabel}</strong>}</div>
                    <div className="result-option-progress" aria-hidden="true"><span style={{width: `${optionPercentage}%`}}/></div>
                    <div className="result-option-meta"><span>{optionPercentage} %</span><span>{option.voteCount} {t('polls.votes')}</span></div>
                    {current && <small>{t('polls.yourVote')}</small>}
                </li>;
            })}</ol>
            {withdrawalError && <p className="form-error" role="alert">{t(withdrawalError.messageKey)}</p>}
            {results.state === 'active' && projection.currentOptionNumber !== null && <button className="text-button" type="button"
                                                                                disabled={withdrawal.isPending}
                                                                                onClick={() => {
                                                                                    if (window.confirm(t('polls.confirmWithdrawal'))) withdrawal.mutate();
                                                                                }}>{withdrawal.isPending ? t('polls.withdrawing') : t('polls.withdraw')}</button>}
            <p className="poll-detail-links"><Link to={`/poll/${encodeURIComponent(results.id)}`}>{t('common.polls')}</Link> | <Link
                to={`/poll/audit/${encodeURIComponent(results.id)}`}>{t('audit.title')}</Link></p>
        </section>
        <aside className="result-leader-panel" aria-label={t('polls.currentLeader')}>
            <p className="eyebrow">{t('polls.currentLeader')}</p>
            {projection.winnerOptions.length === 0 ? <h3>{t('polls.noWinner')}</h3> : <>
                <p className="result-leader-label">{winnerLabel}</p>
                <h3>{projection.winnerOptions.map((option) => option.text).join(', ')}</h3>
            </>}
            <dl>
                <div><dt>{t('polls.highestShare')}</dt><dd>{projection.highestPercentage} %</dd></div>
                <div><dt>{t('polls.endsAt')}</dt><dd>{results.endsAt ? <time dateTime={results.endsAt}>{formatTimestamp(results.endsAt, locale)}</time> : t('polls.noEndDate')}</dd></div>
            </dl>
        </aside>
    </div>;
}

function OptionDetail({results, option, locale}: { results: PollResults; option: PollResults['options'][number]; locale: 'de' | 'en' }) {
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
