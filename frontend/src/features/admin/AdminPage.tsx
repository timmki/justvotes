import {useLocation} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {PageFrame} from '../../shared/ui/PageFrame';
import {AccountAdministration} from './AccountAdministration';
import {AdminVotes} from './AdministrativeVotes';
import {adminSectionDescriptionKey, adminSectionFromPath, adminSectionTitleKey, type AdminSectionName} from './adminSections';
import {InvitationAdministration} from './InvitationAdministration';
import {AdminPolls} from './PollAdministration';
import {TemplateCatalogGroups, TemplateCatalogTemplates} from './TemplateCatalog';

/**
 * Only rendered for the signed-in administrator; the application gate handles sign-in and roles.
 * Each area carries its own page title and description (spec 009, US1).
 */
export function AdminPage() {
    const {t} = useI18n();
    const location = useLocation();
    const section = adminSectionFromPath(location.pathname);
    return <PageFrame title={t(adminSectionTitleKey(section))} description={t(adminSectionDescriptionKey(section))}>
        <AdminSectionView section={section}/>
    </PageFrame>;
}

function AdminSectionView({section}: { section: AdminSectionName }) {
    if (section === 'votes') return <AdminVotes/>;
    if (section === 'polls') return <AdminPolls/>;
    if (section === 'groups') return <TemplateCatalogGroups/>;
    if (section === 'templates') return <TemplateCatalogTemplates/>;
    if (section === 'accounts') return <AccountAdministration/>;
    return <InvitationAdministration/>;
}
