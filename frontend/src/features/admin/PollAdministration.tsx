import { useMutation, useQueries } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { components } from '../../shared/api/generated/justvotes';
import { apiClient } from '../../shared/api/client';
import { ApiError, type FrontendError } from '../../shared/api/errors';
import { queryClient } from '../../shared/api/queryClient';
import { queryKeys } from '../../shared/api/queryKeys';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { QueryState } from '../../shared/ui/QueryState';
import { RouteState } from '../../shared/ui/RouteState';

type Poll = components['schemas']['Poll'];
type PollState = Poll['state'];
type PollAction = 'publish' | 'makePrivate' | 'changeExpiry' | 'archive' | 'restoreFromArchive' | 'reopen' | 'softDelete' | 'restore' | 'permanentDelete';
type PollMutation =
  | { action: 'replaceOptions'; optionTexts: string[] }
  | { action: 'publish'; endsAt: string }
  | { action: 'changeExpiry'; endsAt: string }
  | { action: Exclude<PollAction, 'publish' | 'changeExpiry'> };

const actionMatrix: Record<PollState, readonly PollAction[]> = {
  draft: ['publish'],
  active: ['makePrivate', 'archive', 'softDelete'],
  expired: ['changeExpiry', 'archive', 'reopen', 'softDelete'],
  archived: ['restoreFromArchive', 'softDelete'],
  deleted: ['restore', 'permanentDelete'],
};

export function AdminPolls() {
  const { t } = useI18n();
  const query = useApiQuery(queryKeys.adminPolls, () => apiClient.getAdminPolls());
  return <QueryState query={query}>{(polls) => <section className="admin-panel"><h3>{t('admin.polls')}</h3>{polls.length === 0 ? <RouteState status="empty" /> : <ul className="poll-admin-list">{polls.map((poll) => <PollAdministrationCard key={poll.id} poll={poll} />)}</ul>}</section>}</QueryState>;
}

function PollAdministrationCard({ poll }: { poll: Poll }) {
  const { t, locale } = useI18n();
  const [editingOptions, setEditingOptions] = useState(false);
  const [optionDraft, setOptionDraft] = useState(() => poll.options.map((option) => option.text).join('\n'));
  const [optionsInvalid, setOptionsInvalid] = useState(false);
  const [error, setError] = useState<FrontendError | null>(null);
  const mutation = useMutation({
    mutationFn: (request: PollMutation) => executePollMutation(poll.id, request),
    onSuccess: async (updated) => {
      if (updated) updatePollCache(updated);
      else queryClient.setQueryData<Poll[]>(queryKeys.adminPolls, (current) => current?.filter((candidate) => candidate.id !== poll.id));
      setEditingOptions(false);
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminPolls }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicPolls }),
        queryClient.invalidateQueries({ queryKey: queryKeys.poll(poll.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pollResults(poll.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pollAudit(poll.id) }),
      ]);
    },
    onError: (cause) => setError(frontendError(cause)),
  });
  const actions = actionMatrix[poll.state].filter((action) => action !== 'makePrivate' || poll.visibility === 'public');
  const canReopen = poll.endsAt !== null && new Date(poll.endsAt).getTime() > Date.now();

  useEffect(() => {
    if (!editingOptions) setOptionDraft(poll.options.map((option) => option.text).join('\n'));
  }, [editingOptions, poll.options]);

  function submitOptions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const optionTexts = optionDraft.split('\n').map((text) => text.trim()).filter(Boolean);
    if (optionTexts.length < 2) { setOptionsInvalid(true); return; }
    setOptionsInvalid(false);
    mutation.mutate({ action: 'replaceOptions', optionTexts });
  }

  function requestAction(action: Exclude<PollAction, 'publish' | 'changeExpiry'>) {
    if (action === 'softDelete' && !window.confirm(t('admin.confirmSoftDelete'))) return;
    if (action === 'permanentDelete' && (!window.confirm(t('admin.confirmPermanentDelete')) || !window.confirm(t('admin.confirmPermanentDeleteAgain')))) return;
    mutation.mutate({ action });
  }

  return <li className="poll-admin-card">
    <div className="poll-admin-heading"><div><h4>{poll.title}</h4><p className="poll-admin-meta">{t(poll.visibility === 'public' ? 'admin.public' : 'admin.private')} · {t(stateTranslationKey(poll.state))} · {poll.endsAt ? formatDate(poll.endsAt, locale) : t('admin.noExpiry')}</p></div><span className="poll-id">{poll.id}</span></div>
    <div className="poll-admin-columns">
      <section aria-labelledby={`snapshot-${poll.id}`}><h5 id={`snapshot-${poll.id}`}>{t('admin.snapshot')}</h5><p><strong>{poll.templateGroup.name}</strong>{poll.templateGroup.description && `: ${poll.templateGroup.description}`}</p><ol className="poll-options">{poll.templateSnapshotOptions.map((option) => <li key={option.number} value={option.number}>{option.text}</li>)}</ol></section>
      <section aria-labelledby={`options-${poll.id}`}><h5 id={`options-${poll.id}`}>{t('admin.currentOptions')}</h5>{editingOptions ? <form className="catalog-form" onSubmit={submitOptions}><label htmlFor={`options-edit-${poll.id}`}>{t('admin.optionsInput')}</label><textarea id={`options-edit-${poll.id}`} rows={5} value={optionDraft} onChange={(event) => { setOptionDraft(event.target.value); setOptionsInvalid(false); }} />{optionsInvalid && <p className="form-error" role="alert">{t('errors.generic')}</p>}<div className="identity-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{t('forms.submit')}</button><button className="text-button" type="button" onClick={() => setEditingOptions(false)} disabled={mutation.isPending}>{t('forms.cancel')}</button></div></form> : <><ol className="poll-options">{poll.options.map((option) => <li key={option.number} value={option.number}>{option.text}</li>)}</ol>{poll.state === 'draft' && <button className="secondary-button" type="button" onClick={() => { setOptionsInvalid(false); setEditingOptions(true); }}>{t('admin.editOptions')}</button>}</>}</section>
    </div>
    <div className="poll-admin-actions"><h5>{t('admin.actions')}</h5>{actions.includes('publish') && <ExpiryForm key={`${poll.id}-publish`} inputId={`${poll.id}-publish-expiry`} label={t('admin.publish')} submitLabel={t('admin.publish')} onSubmit={(endsAt) => mutation.mutate({ action: 'publish', endsAt })} pending={mutation.isPending} />}{actions.includes('changeExpiry') && <ExpiryForm key={`${poll.id}-${poll.endsAt ?? 'none'}-expiry`} inputId={`${poll.id}-change-expiry`} label={t('admin.changeExpiry')} initialValue={poll.endsAt} submitLabel={t('admin.changeExpiry')} onSubmit={(endsAt) => mutation.mutate({ action: 'changeExpiry', endsAt })} pending={mutation.isPending} />}{actions.includes('makePrivate') && <button className="secondary-button" type="button" onClick={() => requestAction('makePrivate')} disabled={mutation.isPending}>{t('admin.makePrivate')}</button>}{actions.includes('archive') && <button className="secondary-button" type="button" onClick={() => requestAction('archive')} disabled={mutation.isPending}>{t('admin.archive')}</button>}{actions.includes('restoreFromArchive') && <button className="secondary-button" type="button" onClick={() => requestAction('restoreFromArchive')} disabled={mutation.isPending}>{t('admin.restoreFromArchive')}</button>}{actions.includes('reopen') && <button className="secondary-button" type="button" onClick={() => requestAction('reopen')} disabled={mutation.isPending || !canReopen} title={!canReopen ? t('admin.reopenNeedsFutureExpiry') : undefined}>{t('admin.reopen')}</button>}{actions.includes('softDelete') && <button className="secondary-button destructive-button" type="button" onClick={() => requestAction('softDelete')} disabled={mutation.isPending}>{t('admin.softDelete')}</button>}{actions.includes('restore') && <button className="secondary-button" type="button" onClick={() => requestAction('restore')} disabled={mutation.isPending}>{t('admin.restore')}</button>}{actions.includes('permanentDelete') && <button className="secondary-button destructive-button" type="button" onClick={() => requestAction('permanentDelete')} disabled={mutation.isPending}>{t('admin.permanentDelete')}</button>}</div>
    {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
    <p className="poll-admin-links"><Link to={`/poll/${encodeURIComponent(poll.id)}`}>{t('admin.openPoll')}</Link> · <Link to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link> · <Link to={`/poll/audit/${encodeURIComponent(poll.id)}`}>{t('audit.title')}</Link></p>
  </li>;
}

function ExpiryForm({ inputId, label, initialValue, submitLabel, onSubmit, pending }: { inputId: string; label: string; initialValue?: string | null; submitLabel: string; onSubmit: (endsAt: string) => void; pending: boolean }) {
  const { t } = useI18n();
  const [value, setValue] = useState(() => toDateTimeLocal(initialValue));
  const [invalid, setInvalid] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endsAt = parseFutureDate(value);
    if (!endsAt) { setInvalid(true); return; }
    setInvalid(false);
    onSubmit(endsAt);
  }

  return <form className="expiry-form" onSubmit={submit}><label htmlFor={inputId}>{label}</label><input id={inputId} type="datetime-local" value={value} onChange={(event) => { setValue(event.target.value); setInvalid(false); }} required /><button className="secondary-button" type="submit" disabled={pending || !isFutureDate(value)}>{submitLabel}</button>{invalid && <span className="form-error" role="alert">{t('admin.invalidExpiry')}</span>}</form>;
}

export function CreatePoll() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState<FrontendError | null>(null);
  const groupsQuery = useApiQuery(queryKeys.groups, () => apiClient.getGroups());
  const groups = groupsQuery.data ?? [];
  const membershipQueries = useQueries({ queries: groups.map((group) => ({ queryKey: queryKeys.groupTemplates(group.id), queryFn: () => apiClient.getTemplatesInGroup(group.id) })) });
  const availableGroups = groups.filter((_, index) => (membershipQueries[index]?.data?.length ?? 0) > 0);
  const membershipError = membershipQueries.find((query) => query.isError)?.error;
  const membershipPending = membershipQueries.some((query) => query.isPending);
  const mutation = useMutation({
    mutationFn: () => apiClient.createPoll({ title: title.trim(), templateGroupId: groupId }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.adminPolls }), queryClient.invalidateQueries({ queryKey: queryKeys.publicPolls })]);
      navigate('/admin/polls');
    },
    onError: (cause) => setError(frontendError(cause)),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId || !availableGroups.some((group) => group.id === groupId)) return;
    setError(null);
    mutation.mutate();
  }

  return <QueryState query={groupsQuery}>{() => membershipError ? <RouteState status="error" error={membershipError instanceof ApiError ? membershipError.frontend : undefined} /> : membershipPending ? <RouteState status="loading" /> : <section className="admin-panel"><h3>{t('admin.createPoll')}</h3>{availableGroups.length === 0 && <p className="stale-state">{t('admin.noNonEmptyGroups')}</p>}<form className="login-form" onSubmit={submit}><label htmlFor="poll-title">{t('admin.pollTitle')}</label><input id="poll-title" required value={title} onChange={(event) => setTitle(event.target.value)} /><label htmlFor="poll-group">{t('admin.templateGroup')}</label><select id="poll-group" required value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">{t('admin.selectGroup')}</option>{availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><button className="primary-button" type="submit" disabled={mutation.isPending || availableGroups.length === 0 || !groupId}>{mutation.isPending ? t('common.saving') : t('forms.submit')}</button>{error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}</form></section>}</QueryState>;
}

async function executePollMutation(pollId: string, request: PollMutation) {
  switch (request.action) {
    case 'replaceOptions': return apiClient.replacePollOptions(pollId, request.optionTexts);
    case 'publish': return apiClient.publishPoll(pollId, request.endsAt);
    case 'makePrivate': return apiClient.makePollPrivate(pollId);
    case 'changeExpiry': return apiClient.changePollExpiry(pollId, request.endsAt);
    case 'archive': return apiClient.archivePoll(pollId);
    case 'restoreFromArchive': return apiClient.restorePollFromArchive(pollId);
    case 'reopen': return apiClient.reopenPoll(pollId);
    case 'softDelete': return apiClient.deletePoll(pollId);
    case 'restore': return apiClient.restorePoll(pollId);
    case 'permanentDelete': return apiClient.permanentlyDeletePoll(pollId);
    default: return assertNever(request);
  }
}

function updatePollCache(updated: Poll) {
  queryClient.setQueryData<Poll[]>(queryKeys.adminPolls, (current) => current?.map((poll) => poll.id === updated.id ? updated : poll));
}

function assertNever(value: never): never { throw new Error(`Unknown poll action: ${JSON.stringify(value)}`); }

function parseFutureDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now() ? null : date.toISOString();
}

function isFutureDate(value: string) {
  return parseFutureDate(value) !== null;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function frontendError(cause: unknown): FrontendError {
  return cause instanceof ApiError ? cause.frontend : { kind: 'problem', status: null, code: 'unexpected_error', detail: null, retryable: false, messageKey: 'errors.generic' };
}

function stateTranslationKey(state: PollState) {
  const keys = { draft: 'admin.stateDraft', active: 'admin.stateActive', expired: 'admin.stateExpired', archived: 'admin.stateArchived', deleted: 'admin.stateDeleted' } as const;
  return keys[state];
}
