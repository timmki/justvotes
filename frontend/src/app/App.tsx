import { Component, createContext, useContext, useState, type ErrorInfo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { I18nProvider, useI18n } from '../shared/i18n/I18nProvider';
import { messages, type Locale } from '../shared/i18n/translations';
import { ThemeProvider, useTheme } from './theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

type StateStatus = 'loading' | 'empty' | 'error';

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <ToastProvider>
            <AppContent />
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

function AppContent() {
  return (
    <div className="app-root">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/polls" element={<PollsPage />} />
          <Route path="/poll/results/:pollId/option/:optionNumber" element={<OptionPage />} />
          <Route path="/poll/results/:pollId" element={<ResultsPage />} />
          <Route path="/poll/audit/:pollId" element={<AuditPage />} />
          <Route path="/poll/:pollId" element={<PollPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Header() {
  const { locale, setLocale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const title = pageTitle(location.pathname, t);
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/polls');
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-side">
          {!isHome && (
            <div className="header-navigation">
              <button className="icon-button" type="button" aria-label={t('common.back')} onClick={goBack}>
                <ChevronLeftIcon />
              </button>
              <Link className="header-home-link" to="/polls">{t('common.polls')}</Link>
            </div>
          )}
        </div>
        <h1>{title}</h1>
        <div className="header-actions">
          <button
            className="control-button"
            type="button"
            aria-label={locale === 'de' ? t('common.english') : t('common.german')}
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
          >
            {locale.toUpperCase()}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={theme === 'light' ? t('common.darkTheme') : t('common.lightTheme')}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

function HomePage() {
  const { t } = useI18n();
  return (
    <PageFrame eyebrow="JustVotes" title={t('common.home')} description={t('common.homeDescription')}>
      <section className="identity-card" aria-labelledby="identity-heading">
        <p className="eyebrow">{t('common.identity')}</p>
        <h2 id="identity-heading">{t('common.identityNotLoaded')}</h2>
        <p>{t('common.identityNote')}</p>
      </section>
      <nav className="primary-navigation" aria-label={t('common.mainNavigation')}>
        <Link className="action-card" to="/polls">
          <span><strong>{t('common.polls')}</strong><small>{t('common.publicArea')}</small></span>
          <ChevronRightIcon />
        </Link>
        <Link className="action-card secondary" to="/admin">
          <span><strong>{t('common.admin')}</strong><small>{t('common.adminArea')}</small></span>
          <ChevronRightIcon />
        </Link>
      </nav>
    </PageFrame>
  );
}

function PollsPage() {
  const { t } = useI18n();
  return <DataPage eyebrow={t('common.publicArea')} title={t('polls.list')} description={t('common.publicArea')} />;
}

function PollPage() {
  const { t } = useI18n();
  const { pollId } = useParams();
  return <DataPage eyebrow={`Poll ${pollId ?? ''}`} title={t('polls.detail')} description={t('common.pollDescription')} />;
}

function ResultsPage() {
  const { t } = useI18n();
  const { pollId } = useParams();
  return <DataPage eyebrow={`Poll ${pollId ?? ''}`} title={t('polls.results')} description={t('common.resultsDescription')} />;
}

function OptionPage() {
  const { t } = useI18n();
  const { optionNumber } = useParams();
  return <DataPage eyebrow={`Option ${optionNumber ?? ''}`} title={t('polls.option')} description={t('common.optionDescription')} />;
}

function AuditPage() {
  const { t } = useI18n();
  return <DataPage eyebrow={t('common.history')} title={t('audit.title')} description={t('common.auditDescription')} />;
}

function AdminPage() {
  const { t } = useI18n();
  return <DataPage eyebrow={t('common.privateArea')} title={t('admin.title')} description={t('common.adminDescription')} />;
}

function DataPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const { search } = useLocation();
  const requestedState = new URLSearchParams(search).get('state');
  const status: StateStatus = requestedState === 'loading' || requestedState === 'error' ? requestedState : 'empty';
  return <PageFrame eyebrow={eyebrow} title={title} description={description}><RouteState status={status} /></PageFrame>;
}

function NotFoundPage() {
  const { t } = useI18n();
  return (
    <PageFrame eyebrow="404" title={t('errors.notFound')} description={t('errors.notFoundText')}>
      <Link className="primary-button" to="/">{t('common.home')}</Link>
    </PageFrame>
  );
}

function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="page-frame">
      <section className="page-intro" aria-labelledby="page-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="page-heading">{title}</h2>
        <p>{description}</p>
      </section>
      {children}
      <p className="sr-only" aria-live="polite">{t('notifications.status')}</p>
    </div>
  );
}

export function RouteState({ status, onRetry = () => window.location.reload() }: { status: StateStatus; onRetry?: () => void }) {
  const { t } = useI18n();
  const content = {
    loading: { title: t('common.loading'), text: t('common.loadingText'), icon: <SpinnerIcon /> },
    empty: { title: t('common.empty'), text: t('common.emptyText'), icon: <EmptyIcon /> },
    error: { title: t('common.error'), text: t('common.errorText'), icon: <ErrorIcon /> },
  }[status];

  return (
    <section className={`route-state ${status}`} aria-label={t('common.pageState')}>
      {status === 'loading' ? <div role="status">{content.icon}<span className="sr-only">{content.title}</span></div> : <div aria-hidden="true">{content.icon}</div>}
      <div><h3>{content.title}</h3><p>{content.text}</p>{status === 'error' && <button className="text-button" type="button" onClick={onRetry}>{t('common.retry')}</button>}</div>
    </section>
  );
}

function ToastRegion() {
  const { t } = useI18n();
  const { toasts, dismiss } = useToast();
  return <div className="toast-region" aria-label={t('notifications.status')} aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div className={`toast ${toast.tone}`} role="status" key={toast.id}>{toast.message}<button type="button" aria-label={t('common.dismiss')} onClick={() => dismiss(toast.id)}>×</button></div>)}</div>;
}

type Toast = { id: number; message: string; tone: 'info' | 'success' | 'error' };
type ToastContextValue = { toasts: Toast[]; showToast: (message: string, tone?: Toast['tone']) => void; dismiss: (id: number) => void };
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, tone: Toast['tone'] = 'info') => setToasts((current) => [...current, { id: nextToastId++, message, tone }]);
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));
  return <ToastContext value={{ toasts, showToast, dismiss }}>{children}<ToastRegion /></ToastContext>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

function pageTitle(pathname: string, t: ReturnType<typeof useI18n>['t']) {
  if (pathname === '/') return t('common.appName');
  if (pathname === '/polls') return t('polls.list');
  if (pathname.startsWith('/poll/results/') && pathname.includes('/option/')) return t('polls.option');
  if (pathname.startsWith('/poll/results/')) return t('polls.results');
  if (pathname.startsWith('/poll/audit/')) return t('audit.title');
  if (pathname.startsWith('/poll/')) return t('polls.detail');
  if (pathname === '/admin') return t('admin.title');
  return t('errors.notFound');
}

type BoundaryProps = { children: ReactNode };
type BoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application rendering failed', error, info);
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}

function ErrorFallback() {
  const locale: Locale = document.documentElement.lang === 'en' ? 'en' : 'de';
  const common = messages[locale].common;
  const errors = messages[locale].errors;
  return <div className="page-frame error-page"><p className="eyebrow">{locale === 'de' ? 'Fehler' : 'Error'}</p><h1>{errors.boundary}</h1><p>{errors.boundaryText}</p><a className="primary-button" href="/">{common.home}</a></div>;
}

function ChevronLeftIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>; }
function ChevronRightIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>; }
function MoonIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></svg>; }
function SunIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function SpinnerIcon() { return <span className="spinner" aria-hidden="true" />; }
function EmptyIcon() { return <span className="state-dot" aria-hidden="true" />; }
function ErrorIcon() { return <span className="state-alert" aria-hidden="true">!</span>; }
