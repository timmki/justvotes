import { useEffect, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sessionCoordinator } from '../api/client';
import { useI18n } from '../i18n/I18nProvider';

export function SessionNotice() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const required = useSyncExternalStore((listener) => sessionCoordinator.subscribe(listener), () => sessionCoordinator.isLoginRequired(), () => false);
  useEffect(() => { if (required && location.pathname !== '/admin') navigate('/admin', { replace: true }); }, [location.pathname, navigate, required]);
  if (!required) return null;
  return <aside className="session-notice" role="alert"><strong>{t('common.sessionRequired')}</strong><span>{t('common.sessionRequiredText')}</span><Link to="/admin">{t('common.admin')}</Link></aside>;
}
