import { useMutation } from '@tanstack/react-query';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiClient, sessionCoordinator } from '../../shared/api/client';
import { ApiError, type FrontendError } from '../../shared/api/errors';
import { queryClient } from '../../shared/api/queryClient';
import { queryKeys } from '../../shared/api/queryKeys';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { PageFrame } from '../../shared/ui/PageFrame';
import { QueryState } from '../../shared/ui/QueryState';
import { RouteState } from '../../shared/ui/RouteState';
import { TemplateCatalogGroups, TemplateCatalogTemplates } from './TemplateCatalog';

type AdminSectionName = 'votes' | 'polls' | 'groups' | 'templates' | 'create';

export function AdminPage() {
  const { t } = useI18n();
  const location = useLocation();
  const sessionRequiredSignal = useSyncExternalStore((listener) => sessionCoordinator.subscribe(listener), () => sessionCoordinator.isLoginRequired(), () => false);
  const loginRequired = sessionRequiredSignal || sessionCoordinator.isLoginRequired();
  const sessionQuery = useApiQuery(queryKeys.adminSession, verifyAdminSession, { enabled: !loginRequired });
  const section = sectionFromPath(location.pathname);

  if (loginRequired || isUnauthorized(sessionQuery.error)) return <AdminAccess mode="login" />;
  if (sessionQuery.isPending) return <AdminAccess mode="loading" />;
  if (sessionQuery.isError) return <AdminAccess mode="error" error={sessionQuery.error} onRetry={() => { void sessionQuery.refetch(); }} />;
  return <AdminShell section={section ?? 'votes'} />;
}

function AdminAccess({ mode, error, onRetry }: { mode: 'loading' | 'login' | 'error'; error?: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return <PageFrame eyebrow={t('common.privateArea')} title={t('admin.title')} description={t('common.adminDescription')}>
    {mode === 'loading' && <RouteState status="loading" />}
    {mode === 'error' && <RouteState status="error" error={error instanceof ApiError ? error.frontend : undefined} onRetry={onRetry} />}
    {mode === 'login' && <AdminLoginForm />}
  </PageFrame>;
}

function AdminLoginForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FrontendError | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiClient.login({ username, password });
      await queryClient.fetchQuery({ queryKey: queryKeys.adminSession, queryFn: verifyAdminSession });
      const returnRoute = sessionCoordinator.consumeReturnRoute();
      const targetRoute = returnRoute === '/admin' ? '/admin/votes' : returnRoute ?? '/admin/votes';
      navigate(targetRoute, { replace: returnRoute !== null });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.frontend : null);
    } finally {
      setPending(false);
    }
  }

  return <form className="login-form" onSubmit={submit}>
    <label htmlFor="admin-username">{t('common.username')}</label>
    <input id="admin-username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
    <label htmlFor="admin-password">{t('common.password')}</label>
    <input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
    <button className="primary-button" type="submit" disabled={pending}>{pending ? t('common.signingIn') : error?.retryable ? t('common.retry') : t('common.signIn')}</button>
    {pending && <p role="status">{t('common.signingIn')}</p>}
    {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
  </form>;
}

function AdminShell({ section }: { section: AdminSectionName }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FrontendError | null>(null);
  const tabs: { section: AdminSectionName; path: string; label: string }[] = [
    { section: 'votes', path: '/admin/votes', label: t('admin.votes') },
    { section: 'polls', path: '/admin/polls', label: t('admin.polls') },
    { section: 'groups', path: '/admin/groups', label: t('admin.groups') },
    { section: 'templates', path: '/admin/templates', label: t('admin.templates') },
    { section: 'create', path: '/admin/create', label: t('admin.createPoll') },
  ];

  async function logout() {
    setPending(true);
    setError(null);
    try {
      await apiClient.logout();
      navigate('/admin', { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.frontend : null);
    } finally {
      setPending(false);
    }
  }

  return <PageFrame eyebrow={t('common.privateArea')} title={t('admin.title')} description={t('common.adminDescription')}>
    <nav className="admin-tabs" aria-label={t('common.adminNavigation')}>
      {tabs.map((tab) => <NavLink key={tab.section} className="admin-tab" to={tab.path} aria-current={section === tab.section ? 'page' : undefined}>{tab.label}</NavLink>)}
    </nav>
    <div className="admin-toolbar"><button className="text-button" type="button" onClick={logout} disabled={pending}>{pending ? t('common.loggingOut') : t('common.logout')}</button></div>
    {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
    <AdminSectionView section={section} />
  </PageFrame>;
}

function AdminSectionView({ section }: { section: AdminSectionName }) {
  if (section === 'votes') return <AdminVotes />;
  if (section === 'polls') return <AdminPolls />;
  if (section === 'groups') return <TemplateCatalogGroups />;
  if (section === 'templates') return <TemplateCatalogTemplates />;
  return <CreatePoll />;
}

function AdminVotes() {
  const { t } = useI18n();
  const query = useApiQuery(queryKeys.adminVotes(0, 50), () => apiClient.getAdminVotes());
  return <QueryState query={query}>{(page) => <section className="admin-panel"><h3>{t('admin.votes')}</h3>{page.votes.length === 0 ? <RouteState status="empty" /> : <ul className="data-list">{page.votes.map((vote) => <li key={vote.voteId}>{vote.poll.title}: {vote.option.text} ({vote.userID})</li>)}</ul>}</section>}</QueryState>;
}

function AdminPolls() {
  const { t } = useI18n();
  const query = useApiQuery(queryKeys.adminPolls, () => apiClient.getAdminPolls());
  return <QueryState query={query}>{(polls) => <section className="admin-panel"><h3>{t('admin.polls')}</h3>{polls.length === 0 ? <RouteState status="empty" /> : <ul className="data-list">{polls.map((poll) => <li key={poll.id}><strong>{poll.title}</strong> <span>{poll.state}</span> <span>{poll.totalVotes}</span></li>)}</ul>}</section>}</QueryState>;
}

function CreatePoll() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState<FrontendError | null>(null);
  const groupsQuery = useApiQuery(queryKeys.groups, () => apiClient.getGroups());
  const mutation = useMutation({
    mutationFn: () => apiClient.createPoll({ title: title.trim(), templateGroupId: groupId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminPolls }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicPolls }),
      ]);
      navigate('/admin/polls');
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.frontend : null),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return <QueryState query={groupsQuery}>{(groups) => <section className="admin-panel"><h3>{t('admin.createPoll')}</h3><form className="login-form" onSubmit={submit}><label htmlFor="poll-title">{t('admin.pollTitle')}</label><input id="poll-title" required value={title} onChange={(event) => setTitle(event.target.value)} /><label htmlFor="poll-group">{t('admin.templateGroup')}</label><select id="poll-group" required value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">{t('admin.selectGroup')}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? t('common.saving') : t('forms.submit')}</button>{error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}</form></section>}</QueryState>;
}

function sectionFromPath(pathname: string): AdminSectionName | null {
  if (pathname === '/admin/votes') return 'votes';
  if (pathname === '/admin/polls') return 'polls';
  if (pathname === '/admin/groups') return 'groups';
  if (pathname === '/admin/templates') return 'templates';
  if (pathname === '/admin/create') return 'create';
  return null;
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.frontend.status === 401;
}

async function verifyAdminSession() {
  await apiClient.getAdminSession();
  return true;
}
