import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useI18n} from '../shared/i18n/I18nProvider';
import {ChevronLeftIcon, MoonIcon, SunIcon} from '../shared/ui/Icons';
import {useTheme} from './theme';

export function Header() {
    const {locale, setLocale, t} = useI18n();
    const {theme, toggleTheme} = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === '/';
    const title = pageTitle(location.pathname, t);
    const goBack = () => {
        if (window.history.state?.idx > 0) navigate(-1); else navigate('/polls');
    };

    return (
        <header className="app-header">
            <div className="header-inner">
                <div className="header-side">
                    {!isHome && <div className="header-navigation">
                        <button className="icon-button" type="button" aria-label={t('common.back')} onClick={goBack}>
                            <ChevronLeftIcon/></button>
                        <Link className="header-home-link" to="/polls">{t('common.polls')}</Link></div>}
                </div>
                <h1>{title}</h1>
                <div className="header-actions">
                    <button className="control-button" type="button"
                            aria-label={locale === 'de' ? t('common.english') : t('common.german')}
                            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}>{locale.toUpperCase()}</button>
                    <button className="icon-button" type="button"
                            aria-label={theme === 'light' ? t('common.darkTheme') : t('common.lightTheme')}
                            aria-pressed={theme === 'dark'} onClick={toggleTheme}>{theme === 'light' ? <MoonIcon/> :
                        <SunIcon/>}</button>
                </div>
            </div>
        </header>
    );
}

function pageTitle(pathname: string, t: ReturnType<typeof useI18n>['t']) {
    if (pathname === '/') return t('common.appName');
    if (pathname === '/polls') return t('polls.list');
    if (pathname.startsWith('/poll/results/') && pathname.includes('/option/')) return t('polls.option');
    if (pathname.startsWith('/poll/results/')) return t('polls.results');
    if (pathname.startsWith('/poll/audit/')) return t('audit.title');
    if (pathname.startsWith('/poll/')) return t('polls.detail');
    if (pathname.startsWith('/admin')) return t('admin.title');
    return t('errors.notFound');
}
