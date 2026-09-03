import {NavLink, Link, useLocation} from 'react-router-dom';
import type {ReactNode} from 'react';
import {useI18n} from '../shared/i18n/I18nProvider';
import {queryKeys} from '../shared/api/queryKeys';
import {useApiQuery} from '../shared/api/useApiQuery';
import {apiClient} from '../shared/api/client';
import {ChevronLeftIcon, MoonIcon, SunIcon} from '../shared/ui/Icons';
import {IdentityEditor} from '../shared/ui/IdentityEditor';
import {useTheme} from './theme';

export function AppShell({children}: {children: ReactNode}) {
    const {t} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const identity = identityQuery.data?.userID ?? null;
    const identityState = identityQuery.isError ? 'error' : identityQuery.isPending ? 'loading' : 'ready';

    return <div className="app-shell">
        <aside className="sidebar" aria-label={t('common.identity')}>
            <Link className="brand" to="/" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">JV</span><h2>{t('common.appName')}</h2>
            </Link>
            <nav className="sidebar-navigation" aria-label={t('common.mainNavigation')}>
                <p className="sidebar-label">{t('common.appName')}</p>
                <NavigationLinks/>
            </nav>
            <div className="sidebar-bottom">
                <IdentityEditor identity={identity} identityState={identityState} variant="compact"/>
            </div>
        </aside>
        <div className="app-content">
            <Header/>
            <MobileNavigation/>
            {children}
        </div>
    </div>;
}

function NavigationLinks() {
    const {t} = useI18n();
    return <ul className="nav-list">
        <li><NavLink className="nav-item" to="/" end>{t('common.home')}</NavLink></li>
        <li><NavLink className="nav-item" to="/polls">{t('common.polls')}</NavLink></li>
        <li><NavLink className="nav-item" to="/admin">{t('common.admin')}</NavLink></li>
    </ul>;
}

function MobileNavigation() {
    const {t} = useI18n();
    return <nav className="mobile-navigation" aria-label={t('common.mainNavigation')}>
        <NavigationLinks/>
    </nav>;
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
