import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, sessionCoordinator } from '../../shared/api/client';
import { ApiError, type FrontendError } from '../../shared/api/errors';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { PageFrame } from '../../shared/ui/PageFrame';

export function AdminPage() { const { t } = useI18n(); return <PageFrame eyebrow={t('common.privateArea')} title={t('admin.title')} description={t('common.adminDescription')}><AdminLoginForm /></PageFrame>; }

function AdminLoginForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FrontendError | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    try { await apiClient.login({ username, password }); const returnRoute = sessionCoordinator.consumeReturnRoute(); navigate(returnRoute ?? '/admin', { replace: returnRoute !== null }); }
    catch (cause) { setError(cause instanceof ApiError ? cause.frontend : null); }
    finally { setPending(false); }
  }

  return <form className="login-form" onSubmit={submit}><label htmlFor="admin-username">{t('common.username')}</label><input id="admin-username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} /><label htmlFor="admin-password">{t('common.password')}</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="primary-button" type="submit" disabled={pending}>{pending ? t('common.signingIn') : error?.retryable ? t('common.retry') : t('common.signIn')}</button>{pending && <p role="status">{t('common.signingIn')}</p>}{error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}</form>;
}
