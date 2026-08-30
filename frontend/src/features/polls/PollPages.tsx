import { Link, useLocation, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { apiClient } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { PageFrame } from '../../shared/ui/PageFrame';
import { QueryState } from '../../shared/ui/QueryState';
import { RouteState, type StateStatus } from '../../shared/ui/RouteState';

export function PollsPage() {
  const { t } = useI18n();
  const forcedState = useForcedState();
  const query = useApiQuery(queryKeys.publicPolls, () => apiClient.getPublicPolls(), { enabled: !forcedState });
  return <DataPage eyebrow={t('common.publicArea')} title={t('polls.list')} description={t('common.publicArea')} forcedState={forcedState}>
    <QueryState query={query}>{(polls) => polls.length === 0 ? <RouteState status="empty" /> : <ul className="data-list">{polls.map((poll) => <li key={poll.id}><Link to={`/poll/${encodeURIComponent(poll.id)}`}>{poll.title}</Link></li>)}</ul>}</QueryState>
  </DataPage>;
}

export function PollPage() {
  const { t } = useI18n();
  const { pollId = '' } = useParams();
  const query = useApiQuery(queryKeys.poll(pollId), () => apiClient.getPoll(pollId));
  return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('polls.detail')} description={t('common.pollDescription')}>
    <QueryState query={query}>{(poll) => <section className="data-card"><h3>{poll.title}</h3><ul className="data-list">{poll.options.map((option) => <li key={option.number}><Link to={`/poll/results/${encodeURIComponent(poll.id)}/option/${option.number}`}>{option.text}</Link></li>)}</ul><p><Link to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link> | <Link to={`/poll/audit/${encodeURIComponent(poll.id)}`}>{t('audit.title')}</Link></p></section>}</QueryState>
  </DataPage>;
}

export function ResultsPage() {
  const { t } = useI18n();
  const { pollId = '' } = useParams();
  const query = useApiQuery(queryKeys.pollResults(pollId), () => apiClient.getPollResults(pollId));
  return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('polls.results')} description={t('common.resultsDescription')}>
    <QueryState query={query}>{(results) => <section className="data-card"><h3>{results.title}</h3><ul className="data-list">{results.options.map((option) => <li key={option.number}><Link to={`/poll/results/${encodeURIComponent(results.id)}/option/${option.number}`}>{option.text}</Link><span> {option.voteCount}</span></li>)}</ul></section>}</QueryState>
  </DataPage>;
}

export function OptionPage() {
  const { t } = useI18n();
  const { pollId = '', optionNumber = '' } = useParams();
  const query = useApiQuery(queryKeys.pollResults(pollId), () => apiClient.getPollResults(pollId));
  return <DataPage eyebrow={`${t('common.optionLabel')} ${optionNumber}`} title={t('polls.option')} description={t('common.optionDescription')}>
    <QueryState query={query}>{(results) => { const option = results.options.find((candidate) => String(candidate.number) === optionNumber); return option ? <section className="data-card"><h3>{option.text}</h3><ul className="data-list">{option.votes.map((vote) => <li key={`${vote.userID}-${vote.votedAt}`}>{vote.userID}</li>)}</ul></section> : <RouteState status="empty" />; }}</QueryState>
  </DataPage>;
}

export function AuditPage() {
  const { t } = useI18n();
  const { pollId = '' } = useParams();
  const query = useApiQuery(queryKeys.pollAudit(pollId), () => apiClient.getPollAudit(pollId));
  return <DataPage eyebrow={`${t('common.pollLabel')} ${pollId}`} title={t('audit.title')} description={t('common.auditDescription')}>
    <QueryState query={query}>{(entries) => entries.length === 0 ? <RouteState status="empty" /> : <ol className="data-list">{entries.map((entry, index) => <li key={`${entry.occurredAt}-${index}`}>{entry.event}</li>)}</ol>}</QueryState>
  </DataPage>;
}

function DataPage({ eyebrow, title, description, forcedState, children }: { eyebrow: string; title: string; description: string; forcedState?: StateStatus; children: ReactNode }) {
  return <PageFrame eyebrow={eyebrow} title={title} description={description}>{forcedState ? <RouteState status={forcedState} /> : children}</PageFrame>;
}

function useForcedState(): StateStatus | undefined {
  const { search } = useLocation();
  const requestedState = new URLSearchParams(search).get('state');
  return requestedState === 'loading' || requestedState === 'error' ? requestedState : undefined;
}
