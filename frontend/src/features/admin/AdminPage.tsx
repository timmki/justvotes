import {useLocation} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {PageFrame} from '../../shared/ui/PageFrame';
import {AccountAdministration} from './AccountAdministration';
import {AdminVotes} from './AdministrativeVotes';
import {InvitationAdministration} from './InvitationAdministration';
import {AdminPolls} from './PollAdministration';
import {TemplateCatalogGroups, TemplateCatalogTemplates} from './TemplateCatalog';

type AdminSectionName = 'votes' | 'polls' | 'groups' | 'templates' | 'accounts' | 'invitations';

/**
 * Only rendered for the signed-in administrator; the application gate handles sign-in and roles.
 */
export function AdminPage() {
    const {t} = useI18n();
    const location = useLocation();
    const section = sectionFromPath(location.pathname);
    return <PageFrame title={t('admin.title')} description={t('common.adminDescription')}>
        <AdminSectionView section={section ?? 'votes'}/>
    </PageFrame>;
}

function AdminSectionView({section}: { section: AdminSectionName }) {
    if (section === 'votes') return <AdminVotes/>;
    if (section === 'polls') return <AdminPolls/>;
    if (section === 'groups') return <TemplateCatalogGroups/>;
    if (section === 'templates') return <TemplateCatalogTemplates/>;
    if (section === 'accounts') return <AccountAdministration/>;
    if (section === 'invitations') return <InvitationAdministration/>;
    return <AdminPolls/>;
}

function sectionFromPath(pathname: string): AdminSectionName | null {
    if (pathname === '/admin/votes') return 'votes';
    if (pathname === '/admin/polls') return 'polls';
    if (pathname === '/admin/groups') return 'groups';
    if (pathname === '/admin/templates') return 'templates';
    if (pathname === '/admin/create') return 'polls';
    if (pathname === '/admin/accounts') return 'accounts';
    if (pathname === '/admin/invitations') return 'invitations';
    return null;
}
