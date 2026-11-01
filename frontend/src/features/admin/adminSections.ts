import type {TranslationKey} from '../../shared/i18n/translations';

export type AdminSectionName = 'votes' | 'polls' | 'groups' | 'templates' | 'accounts' | 'invitations';

const sectionTitleKeys = {
    votes: 'admin.votes',
    polls: 'admin.polls',
    groups: 'admin.groups',
    templates: 'admin.templates',
    accounts: 'admin.accounts',
    invitations: 'admin.invitations',
} as const satisfies Record<AdminSectionName, TranslationKey>;

const sectionDescriptionKeys = {
    votes: 'admin.sectionDescriptionVotes',
    polls: 'admin.sectionDescriptionPolls',
    groups: 'admin.sectionDescriptionGroups',
    templates: 'admin.sectionDescriptionTemplates',
    accounts: 'admin.sectionDescriptionAccounts',
    invitations: 'admin.sectionDescriptionInvitations',
} as const satisfies Record<AdminSectionName, TranslationKey>;

/**
 * `/admin` opens the votes and `/admin/create` the polls area; unknown admin paths fall back to the votes.
 */
export function adminSectionFromPath(pathname: string): AdminSectionName {
    if (pathname === '/admin/polls' || pathname === '/admin/create') return 'polls';
    if (pathname === '/admin/groups') return 'groups';
    if (pathname === '/admin/templates') return 'templates';
    if (pathname === '/admin/accounts') return 'accounts';
    if (pathname === '/admin/invitations') return 'invitations';
    return 'votes';
}

export function adminSectionTitleKey(section: AdminSectionName) {
    return sectionTitleKeys[section];
}

export function adminSectionDescriptionKey(section: AdminSectionName) {
    return sectionDescriptionKeys[section];
}
