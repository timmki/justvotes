import { Link } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { ChevronRightIcon } from '../../shared/ui/Icons';
import { PageFrame } from '../../shared/ui/PageFrame';

export function HomePage() {
  const { t } = useI18n();
  return <PageFrame eyebrow="JustVotes" title={t('common.home')} description={t('common.homeDescription')}><section className="identity-card" aria-labelledby="identity-heading"><p className="eyebrow">{t('common.identity')}</p><h2 id="identity-heading">{t('common.identityNotLoaded')}</h2><p>{t('common.identityNote')}</p></section><nav className="primary-navigation" aria-label={t('common.mainNavigation')}><Link className="action-card" to="/polls"><span><strong>{t('common.polls')}</strong><small>{t('common.publicArea')}</small></span><ChevronRightIcon /></Link><Link className="action-card secondary" to="/admin"><span><strong>{t('common.admin')}</strong><small>{t('common.adminArea')}</small></span><ChevronRightIcon /></Link></nav></PageFrame>;
}

export function NotFoundPage() {
  const { t } = useI18n();
  return <PageFrame eyebrow="404" title={t('errors.notFound')} description={t('errors.notFoundText')}><Link className="primary-button" to="/">{t('common.home')}</Link></PageFrame>;
}
