import {NavLink, Link, useLocation} from 'react-router-dom';
import {useEffect, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent, type ReactNode} from 'react';
import {useI18n} from '../shared/i18n/I18nProvider';
import {queryKeys} from '../shared/api/queryKeys';
import {useApiQuery} from '../shared/api/useApiQuery';
import {apiClient, sessionCoordinator} from '../shared/api/client';
import {ChevronLeftIcon, CloseIcon, MenuIcon, MoonIcon, SunIcon} from '../shared/ui/Icons';
import {IdentityDialog} from '../shared/ui/IdentityDialog';
import {IdentityEditor, IdentityStatus} from '../shared/ui/IdentityEditor';
import {useMediaQuery} from '../shared/ui/useMediaQuery';
import {themeOptions, useTheme, type Theme} from './theme';
import {getAppInitials} from '../shared/config/appConfig';

type ShellNavigationMode = 'public' | 'admin' | null;
type IdentityState = 'ready' | 'loading' | 'error';

export function AppShell({children}: {children: ReactNode}) {
    const {t} = useI18n();
    const navigation = useShellNavigation();
    const appName = t('common.appName');
    const appInitials = getAppInitials(appName);
    const {pathname} = useLocation();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const identity = identityQuery.data?.userID ?? null;
    let identityState: IdentityState = 'ready';
    if (identityQuery.isError) identityState = 'error';
    else if (identityQuery.isPending) identityState = 'loading';
    let showSidebarIdentity = true;
    if (pathname === '/') showSidebarIdentity = false;

    return <div className="app-shell">
        <aside className="sidebar" aria-label={t('common.appName')}>
            {navigation === 'public' && <Link className="brand" to="/" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">{appInitials}</span><h2>{appName}</h2>
            </Link>}
            {navigation !== 'public' && <div className="brand" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">{appInitials}</span><h2>{appName}</h2>
            </div>}
            <ShellNavigation className="sidebar-navigation" navigation={navigation} showLabel={navigation === 'admin'}/>
            {showSidebarIdentity && <div className="sidebar-bottom">
                <IdentityEditor identity={identity} identityState={identityState} variant="compact"/>
            </div>}
        </aside>
        <div className="app-content">
            <Header navigation={navigation} identity={identity} identityState={identityState}/>
            {children}
        </div>
    </div>;
}

function useShellNavigation(): ShellNavigationMode {
    const {pathname} = useLocation();
    const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    const loginRequired = useSyncExternalStore((listener) => sessionCoordinator.subscribe(listener), () => sessionCoordinator.isLoginRequired(), () => false);
    const sessionQuery = useApiQuery(queryKeys.adminSession, verifyShellAdminSession, {enabled: adminRoute && !loginRequired});

    if (!adminRoute) return 'public';
    if (sessionQuery.isSuccess) return 'admin';
    return null;
}

async function verifyShellAdminSession() {
    await apiClient.getAdminSession();
    return true;
}

function ShellNavigation({className, navigation, showLabel = false, label}: {
    className: string;
    navigation: ShellNavigationMode;
    showLabel?: boolean;
    label?: string;
}) {
    const {t} = useI18n();
    if (!navigation) return null;
    const admin = navigation === 'admin';
    let navigationLabel: 'common.adminNavigation' | 'common.mainNavigation' = 'common.mainNavigation';
    let title: 'common.admin' | 'common.appName' = 'common.appName';
    if (admin) {
        navigationLabel = 'common.adminNavigation';
        title = 'common.admin';
    }

    return <nav className={className} aria-label={label ?? t(navigationLabel)}>
        {showLabel && <p className="sidebar-label">{t(title)}</p>}
        {admin && <AdminNavigationLinks/>}
        {!admin && <NavigationLinks/>}
    </nav>;
}

function NavigationLinks() {
    const {t} = useI18n();
    return <ul className="nav-list">
        <li><NavLink className="nav-item" to="/" end>{t('common.home')}</NavLink></li>
        <li><NavLink className="nav-item" to="/polls">{t('common.polls')}</NavLink></li>
        <li><NavLink className="nav-item" to="/profile">{t('profile.title')}</NavLink></li>
    </ul>;
}

function AdminNavigationLinks() {
    const {t} = useI18n();
    const {pathname} = useLocation();
    return <ul className="nav-list admin-nav-list">
        <li><AdminNavigationLink to="/admin/votes" active={pathname === '/admin' || pathname === '/admin/votes'}>{t('admin.votes')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/polls" active={pathname === '/admin/polls' || pathname === '/admin/create'}>{t('admin.polls')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/groups" active={pathname === '/admin/groups'}>{t('admin.groups')}</AdminNavigationLink></li>
        <li><AdminNavigationLink to="/admin/templates" active={pathname === '/admin/templates'}>{t('admin.templates')}</AdminNavigationLink></li>
    </ul>;
}

function AdminNavigationLink({to, active, children}: { to: string; active: boolean; children: ReactNode }) {
    let current: 'page' | undefined;
    if (active) current = 'page';
    return <Link className="nav-item" to={to} aria-current={current}>{children}</Link>;
}

export function Header({navigation, identity, identityState}: {
    navigation: ShellNavigationMode;
    identity: string | null;
    identityState: IdentityState;
}) {
    const {locale, setLocale, t} = useI18n();
    const {theme, setTheme} = useTheme();
    const appInitials = getAppInitials(t('common.appName'));
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
    const themeMenuRef = useRef<HTMLDivElement>(null);
    const themeButtonRef = useRef<HTMLButtonElement>(null);
    const themeOptionRefs = useRef<Record<Theme, HTMLInputElement | null>>({light: null, dark: null, claude: null, openai: null});
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const location = useLocation();
    const previousPathname = useRef(location.pathname);
    const context = routeContext(location.pathname, t);
    const isDesktop = useMediaQuery('(min-width: 900px)');

    useEffect(() => {
        if (isDesktop) setMenuOpen(false);
    }, [isDesktop]);

    useEffect(() => {
        if (!themeMenuOpen) return;

        themeOptionRefs.current[theme]?.focus();
        function closeOnOutsideClick(event: MouseEvent) {
            if (!isInside(event, themeMenuRef.current)) {
                setThemeMenuOpen(false);
                themeButtonRef.current?.focus();
            }
        }
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setThemeMenuOpen(false);
                themeButtonRef.current?.focus();
            }
        }

        document.addEventListener('click', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('click', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [theme, themeMenuOpen]);

    useEffect(() => {
        if (!menuOpen) return;

        function closeOnOutsideClick(event: MouseEvent) {
            if (!isInside(event, menuRef.current)) setMenuOpen(false);
        }
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        }

        document.addEventListener('click', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('click', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [menuOpen]);

    useEffect(() => {
        if (previousPathname.current === location.pathname) return;
        previousPathname.current = location.pathname;
        setMenuOpen(false);
        if (!themeMenuOpen) return;
        setThemeMenuOpen(false);
        themeButtonRef.current?.focus();
    }, [location.pathname, themeMenuOpen]);

    function selectTheme(value: Theme) {
        setTheme(value);
        setThemeMenuOpen(false);
        themeButtonRef.current?.focus();
    }

    function toggleThemeMenu() {
        setMenuOpen(false);
        setThemeMenuOpen((open) => !open);
    }

    function toggleMenu() {
        setThemeMenuOpen(false);
        setMenuOpen((open) => !open);
    }

    function closeOnNavigate(event: ReactMouseEvent<HTMLDivElement>) {
        if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false);
    }

    function editIdentity() {
        setMenuOpen(false);
        setIdentityDialogOpen(true);
    }

    function closeIdentityDialog() {
        setIdentityDialogOpen(false);
        menuButtonRef.current?.focus();
    }

    let nextLocale: 'en' | 'de' = 'de';
    let localeLabel: 'common.english' | 'common.german' = 'common.german';
    if (locale === 'de') {
        nextLocale = 'en';
        localeLabel = 'common.english';
    }

    let identityEditAvailable = true;
    if (location.pathname === '/' && !identity) identityEditAvailable = false;
    let menuButtonLabel = t('common.menu');
    if (menuOpen) menuButtonLabel = t('common.closeMenu');

    return <header className="app-header">
        <div className="header-inner">
            <div className="header-context">
                {context && <Link className="back-link" to={context.to}
                                     onClick={() => { if (routeKind(location.pathname).kind === 'admin') sessionCoordinator.consumeReturnRoute(); }}>
                    <ChevronLeftIcon/><span>{context.label}</span></Link>}
                <p className="header-title">{pageTitle(location.pathname, t)}</p>
            </div>
            {navigation === 'public' && <Link className="header-brand" to="/" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">{appInitials}</span>
                <span className="header-brand-name">{t('common.appName')}</span>
            </Link>}
            {navigation !== 'public' && <div className="header-brand" aria-label={t('common.appName')}>
                <span className="brand-mark" aria-hidden="true">{appInitials}</span>
                <span className="header-brand-name">{t('common.appName')}</span>
            </div>}
            <div className="header-actions">
                <button className="control-button" type="button"
                        aria-label={t(localeLabel)}
                        onClick={() => setLocale(nextLocale)}>{locale.toUpperCase()}</button>
                <div className="theme-menu" ref={themeMenuRef}>
                    <button ref={themeButtonRef} className="icon-button" type="button"
                            aria-label={t('common.chooseTheme')} aria-expanded={themeMenuOpen}
                            aria-controls="theme-menu-panel" onClick={toggleThemeMenu}>
                        {theme === 'light' && <MoonIcon/>}
                        {theme !== 'light' && <SunIcon/>}
                    </button>
                    {themeMenuOpen && <div id="theme-menu-panel" className="theme-menu-panel" role="radiogroup"
                                             aria-label={t('common.chooseTheme')}>
                        {themeOptions.map((option) => <label className="theme-option" key={option.value}>
                            <input ref={(element) => { themeOptionRefs.current[option.value] = element; }}
                                   type="radio" name="theme" value={option.value} checked={theme === option.value}
                                   onChange={() => selectTheme(option.value)}
                                   onClick={() => { if (theme === option.value) selectTheme(option.value); }}/>
                            <span>{t(option.labelKey)}</span>
                        </label>)}
                    </div>}
                </div>
                <div className="mobile-menu" ref={menuRef}>
                    <button ref={menuButtonRef} className="icon-button mobile-menu-button" type="button"
                            aria-label={menuButtonLabel} aria-expanded={menuOpen}
                            aria-controls="mobile-menu-panel" onClick={toggleMenu}>
                        {menuOpen && <CloseIcon/>}
                        {!menuOpen && <MenuIcon/>}
                    </button>
                    {menuOpen && <div id="mobile-menu-panel" className="mobile-menu-panel" onClick={closeOnNavigate}>
                        <ShellNavigation className="mobile-menu-navigation" navigation={navigation} label={t('common.menu')}/>
                        <section className="mobile-identity" aria-labelledby="mobile-identity-heading">
                            <p className="eyebrow" id="mobile-identity-heading">{t('common.identity')}</p>
                            <p className="mobile-identity-value"><IdentityStatus identity={identity} identityState={identityState}/></p>
                            {identityEditAvailable && <button className="text-button" type="button" onClick={editIdentity}>{t('common.identityEdit')}</button>}
                        </section>
                    </div>}
                </div>
            </div>
        </div>
        {identityDialogOpen && <IdentityDialog identity={identity} identityState={identityState} onClose={closeIdentityDialog}/>}
    </header>;
}

// The event target may already be detached by the re-render it triggered (icon swaps),
// so membership is checked against the path captured when the event was dispatched.
function isInside(event: Event, element: HTMLElement | null) {
    if (!element) return false;
    return event.composedPath().includes(element);
}

function routeContext(pathname: string, t: ReturnType<typeof useI18n>['t']) {
    const route = routeKind(pathname);
    if (route.kind === 'home') return null;
    if (route.kind === 'admin') return {to: '/', label: t('common.home')};
    if (route.kind === 'polls') return {to: '/', label: t('common.home')};
    if (route.kind === 'results' || route.kind === 'option' || route.kind === 'audit') {
        let to = '/polls';
        if (route.pollId) to = `/poll/${route.pollId}`;
        return {to, label: t('polls.detail')};
    }
    if (route.kind === 'poll') return {to: '/polls', label: t('common.polls')};
    return {to: '/', label: t('common.home')};
}

function pageTitle(pathname: string, t: ReturnType<typeof useI18n>['t']) {
    switch (routeKind(pathname).kind) {
        case 'home': return t('common.home');
        case 'profile': return t('profile.title');
        case 'polls': return t('polls.list');
        case 'poll': return t('polls.detail');
        case 'results': return t('polls.results');
        case 'option': return t('polls.option');
        case 'audit': return t('audit.title');
        case 'admin': return t('admin.title');
        case 'notFound': return t('errors.notFound');
    }
}

function routeKind(pathname: string): {kind: 'home' | 'profile' | 'polls' | 'poll' | 'results' | 'option' | 'audit' | 'admin' | 'notFound'; pollId?: string} {
    if (pathname === '/') return {kind: 'home'};
    if (pathname === '/profile') return {kind: 'profile'};
    if (pathname === '/polls') return {kind: 'polls'};
    const result = pathname.match(/^\/poll\/results\/([^/]+)(?:\/option\/[^/]+)?$/);
    if (result) {
        if (pathname.includes('/option/')) return {kind: 'option', pollId: result[1]};
        return {kind: 'results', pollId: result[1]};
    }
    const audit = pathname.match(/^\/poll\/audit\/([^/]+)$/);
    if (audit) return {kind: 'audit', pollId: audit[1]};
    if (pathname.match(/^\/poll\/[^/]+$/)) return {kind: 'poll'};
    if (pathname.startsWith('/admin')) return {kind: 'admin'};
    return {kind: 'notFound'};
}
