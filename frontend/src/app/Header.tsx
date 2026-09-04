import {NavLink, Link, useLocation} from 'react-router-dom';
import {useSyncExternalStore, type ReactNode} from 'react';
import {useI18n} from '../shared/i18n/I18nProvider';
import {queryKeys} from '../shared/api/queryKeys';
import {useApiQuery} from '../shared/api/useApiQuery';
import {apiClient, sessionCoordinator} from '../shared/api/client';
import {ChevronLeftIcon, MoonIcon, SunIcon} from '../shared/ui/Icons';
import {IdentityEditor} from '../shared/ui/IdentityEditor';
import {useTheme} from './theme';

export function AppShell({children}: {children: ReactNode}) {
    const {t} = useI18n();
    const navigation = useShellNavigation();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const identity = identityQuery.data?.userID ?? null;
    const identityState = identityQuery.isError ? 'error' : identityQuery.isPending ? 'loading' : 'ready';

    return <div className="app-shell">
        <aside className="sidebar" aria-label={t('common.identity')}>
            {navigation === 'public' ? <Link className="brand" to="/" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">JV</span><h2>{t('common.appName')}</h2>
            </Link> : <div className="brand" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">JV</span><h2>{t('common.appName')}</h2>
            </div>}
            <ShellNavigation className="sidebar-navigation" navigation={navigation} showLabel/>
            <div className="sidebar-bottom">
                <IdentityEditor identity={identity} identityState={identityState} variant="compact"/>
            </div>
        </aside>
        <div className="app-content">
            <Header/>
            <ShellNavigation className="mobile-navigation" navigation={navigation}/>
            {children}
        </div>
    </div>;
}

function useShellNavigation(): 'public' | 'admin' | null {
    const {pathname} = useLocation();
    const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    const loginRequired = useSyncExternalStore((listener) => sessionCoordinator.subscribe(listener), () => sessionCoordinator.isLoginRequired(), () => false);
    const sessionQuery = useApiQuery(queryKeys.adminSession, verifyShellAdminSession, {enabled: adminRoute && !loginRequired});

    if (!adminRoute) return 'public';
    return sessionQuery.isSuccess ? 'admin' : null;
}

async function verifyShellAdminSession() {
    await apiClient.getAdminSession();
    return true;
}

function ShellNavigation({className, navigation, showLabel = false}: {
    className: string;
    navigation: 'public' | 'admin' | null;
    showLabel?: boolean;
}) {
    const {t} = useI18n();
    if (!navigation) return null;
    const admin = navigation === 'admin';

    return <nav className={className} aria-label={t(admin ? 'common.adminNavigation' : 'common.mainNavigation')}>
        {showLabel && <p className="sidebar-label">{t(admin ? 'common.admin' : 'common.appName')}</p>}
        {admin ? <AdminNavigationLinks/> : <NavigationLinks/>}
    </nav>;
}

function NavigationLinks() {
    const {t} = useI18n();
    return <ul className="nav-list">
        <li><NavLink className="nav-item" to="/" end>{t('common.home')}</NavLink></li>
        <li><NavLink className="nav-item" to="/polls">{t('common.polls')}</NavLink></li>
        <li><NavLink className="nav-item" to="/admin">{t('common.admin')}</NavLink></li>
    </ul>;
}

function AdminNavigationLinks() {
    const {t} = useI18n();
    const {pathname} = useLocation();
    return <ul className="nav-list admin-nav-list">
        <li><AdminNavigationLink to="/admin/votes" active={pathname === '/admin' || pathname === '/admin/votes'}>{t('admin.votes')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/polls" active={pathname === '/admin/polls'}>{t('admin.polls')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/groups" active={pathname === '/admin/groups'}>{t('admin.groups')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/templates" active={pathname === '/admin/templates'}>{t('admin.templates')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/create" active={pathname === '/admin/create'}>{t('admin.createPoll')}</AdminNavigationLink></li>
    </ul>;
}

function AdminNavigationLink({to, active, children}: { to: string; active: boolean; children: ReactNode }) {
    return <Link className="nav-item" to={to} aria-current={active ? 'page' : undefined}>{children}</Link>;
}

export function Header() {
    const {locale, setLocale, t} = useI18n();
    const {theme, toggleTheme} = useTheme();
    const location = useLocation();
    const context = routeContext(location.pathname, t);

    return <header className="app-header">
        <div className="header-inner">
            <div className="header-context">
                {context && <Link className="back-link" to={context.to}><ChevronLeftIcon/><span>{context.label}</span></Link>}
                <p className="header-title">{pageTitle(location.pathname, t)}</p>
            </div>
            <div className="header-actions">
                <button className="control-button" type="button"
                        aria-label={locale === 'de' ? t('common.english') : t('common.german')}
                        onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}>{locale.toUpperCase()}</button>
                <button className="icon-button" type="button"
                        aria-label={theme === 'light' ? t('common.darkTheme') : t('common.lightTheme')}
                        aria-pressed={theme === 'dark'} onClick={toggleTheme}>
                    {theme === 'light' ? <MoonIcon/> : <SunIcon/>}
                </button>
            </div>
        </div>
    </header>;
}

function routeContext(pathname: string, t: ReturnType<typeof useI18n>['t']) {
    const route = routeKind(pathname);
    if (route.kind === 'home') return null;
    if (route.kind === 'admin') return null;
    if (route.kind === 'polls') return {to: '/', label: t('common.home')};
    if (route.kind === 'results' || route.kind === 'option' || route.kind === 'audit') {
        return {to: route.pollId ? `/poll/${route.pollId}` : '/polls', label: t('polls.detail')};
    }
    if (route.kind === 'poll') return {to: '/polls', label: t('common.polls')};
    return {to: '/', label: t('common.home')};
}

function pageTitle(pathname: string, t: ReturnType<typeof useI18n>['t']) {
    switch (routeKind(pathname).kind) {
        case 'home': return t('common.home');
        case 'polls': return t('polls.list');
        case 'poll': return t('polls.detail');
        case 'results': return t('polls.results');
        case 'option': return t('polls.option');
        case 'audit': return t('audit.title');
        case 'admin': return t('admin.title');
        case 'notFound': return t('errors.notFound');
    }
}

function routeKind(pathname: string): {kind: 'home' | 'polls' | 'poll' | 'results' | 'option' | 'audit' | 'admin' | 'notFound'; pollId?: string} {
    if (pathname === '/') return {kind: 'home'};
    if (pathname === '/polls') return {kind: 'polls'};
    const result = pathname.match(/^\/poll\/results\/([^/]+)(?:\/option\/[^/]+)?$/);
    if (result) return {kind: pathname.includes('/option/') ? 'option' : 'results', pollId: result[1]};
    const audit = pathname.match(/^\/poll\/audit\/([^/]+)$/);
    if (audit) return {kind: 'audit', pollId: audit[1]};
    if (pathname.match(/^\/poll\/[^/]+$/)) return {kind: 'poll'};
    if (pathname.startsWith('/admin')) return {kind: 'admin'};
    return {kind: 'notFound'};
}
