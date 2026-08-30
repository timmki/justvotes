import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../shared/i18n/I18nProvider';
import { apiClient, sessionCoordinator } from '../shared/api/client';
import { queryClient } from '../shared/api/queryClient';
import { App, AppErrorBoundary, RouteState, ToastProvider, useToast } from './App';

afterEach(() => {
  cleanup();
  if (sessionCoordinator.isLoginRequired()) sessionCoordinator.consumeReturnRoute();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('lang');
  vi.restoreAllMocks();
  queryClient.clear();
});

beforeEach(() => {
  vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({ userID: null });
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  );
}

describe('app shell', () => {
  it('renders the home navigation in German by default', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'JustVotes' })).toBeVisible();
    expect(screen.getByRole('link', { name: /^Polls/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /^Admin/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'English anzeigen' })).toBeVisible();
  });

  it('supports every public route and redirects unknown routes to the localized 404 page', () => {
    const routes = [
      '/',
      '/polls',
      '/poll/example',
      '/poll/results/example',
      '/poll/results/example/option/1',
      '/poll/audit/example',
      '/admin',
      '/404',
    ];

    for (const route of routes) {
      const { unmount } = renderApp(route);
      expect(screen.getAllByRole('main').at(-1)).toBeVisible();
      unmount();
    }

    renderApp('/not-a-route');
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden', level: 2 })).toBeVisible();
  });

  it('persists language and theme without using identity storage', () => {
    renderApp();

    fireEvent.click(screen.getAllByRole('button', { name: 'English anzeigen' })[0]);
    expect(screen.getByRole('button', { name: 'Show German' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Enable dark mode' }));

    expect(screen.getByRole('heading', { name: 'Home' })).toBeVisible();
    expect(window.localStorage.getItem('justvotes-locale')).toBe('en');
    expect(window.localStorage.getItem('justvotes-theme')).toBe('dark');
    expect(window.localStorage.getItem('identity')).toBeNull();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('renders explicit data states at the shared route seam', () => {
    render(
      <I18nProvider>
        <div>
          <RouteState status="loading" />
          <RouteState status="empty" />
          <RouteState status="error" />
        </div>
      </I18nProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Wird geladen');
    expect(screen.getByText('Noch keine Daten vorhanden')).toBeVisible();
    expect(screen.getByText('Daten konnten nicht geladen werden')).toBeVisible();
  });

  it('shows the global error fallback', () => {
    const error = new Error('test failure');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <I18nProvider>
          <AppErrorBoundary>
            <ThrowingComponent error={error} />
          </AppErrorBoundary>
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Etwas ist schiefgelaufen' })).toBeVisible();
    vi.restoreAllMocks();
  });

  it('exposes dismissible status notifications', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <ToastHarness />
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zeige Nachricht' }));
    expect(screen.getByRole('status')).toHaveTextContent('Gespeichert');
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a localized login notice after a protected session expires', () => {
    sessionCoordinator.requireLogin('/admin/polls');
    renderApp('/admin');

    expect(screen.getByRole('alert')).toHaveTextContent('Anmeldung erforderlich');
    expect(screen.getByRole('alert')).toHaveTextContent('Geschützte Daten wurden entfernt');
  });

  it('navigates to login when a protected route expires', async () => {
    sessionCoordinator.requireLogin('/admin/polls');
    renderApp('/polls');

    expect(await screen.findByRole('heading', { name: 'Administration', level: 1 })).toBeVisible();
  });

  it('returns to the in-memory target route after login', async () => {
    sessionCoordinator.requireLogin('/polls');
    vi.spyOn(apiClient, 'login').mockResolvedValue(undefined);
    renderApp('/admin');

    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByRole('heading', { name: 'Öffentliche Polls', level: 1 })).toBeVisible();
  });
});

function ThrowingComponent({ error }: { error: Error }): never {
  throw error;
}

function ToastHarness() {
  const { showToast } = useToast();
  return <button type="button" onClick={() => showToast('Gespeichert', 'success')}>Zeige Nachricht</button>;
}
