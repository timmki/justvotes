import {Link} from 'react-router-dom';
import {apiClient} from '../../shared/api/client';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {ChevronRightIcon} from '../../shared/ui/Icons';
import {IdentityEditor} from '../../shared/ui/IdentityEditor';
import {PageFrame} from '../../shared/ui/PageFrame';
import {QueryState} from '../../shared/ui/QueryState';

export function HomePage() {
    const {t} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    return <PageFrame eyebrow="JustVotes" title={t('common.home')} description={t('common.homeDescription')}>
        <QueryState query={identityQuery}>{(identity) => <IdentityEditor identity={identity.userID}/>}</QueryState>
        <nav className="primary-navigation" aria-label={t('common.home')}>
            <Link className="action-card" to="/polls">
                <span><strong>{t('common.polls')}</strong><small>{t('common.publicArea')}</small></span><ChevronRightIcon/>
            </Link>
            <Link className="action-card secondary" to="/admin">
                <span><strong>{t('common.admin')}</strong><small>{t('common.adminArea')}</small></span><ChevronRightIcon/>
            </Link>
        </nav>
    </PageFrame>;
}

export function NotFoundPage() {
    const {t} = useI18n();
    return <PageFrame eyebrow="404" title={t('errors.notFound')} description={t('errors.notFoundText')}>
        <Link className="primary-button" to="/">{t('common.home')}</Link>
    </PageFrame>;
}
