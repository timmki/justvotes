import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {I18nProvider} from '../shared/i18n/I18nProvider';
import {apiClient, sessionCoordinator} from '../shared/api/client';
import {problemError} from '../shared/api/errors';
import {queryClient} from '../shared/api/queryClient';
import {App, AppErrorBoundary, RouteState, ToastProvider, useToast} from './App';

afterEach(() => {
    cleanup();
    if (sessionCoordinator.isLoginRequired()) sessionCoordinator.consumeReturnRoute();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('lang');
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    queryClient.clear();
});

beforeEach(() => {
    vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: null});
    vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([]);
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
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
            <App/>
        </MemoryRouter>,
    );
}

describe('app shell', () => {
    it('uses the configured app name in the shared shell', () => {
        vi.stubEnv('VITE_APP_NAME', 'Foo App');

        renderApp();

        expect(screen.getByRole('link', {name: 'Foo App'})).toBeVisible();
        expect(screen.getByRole('link', {name: 'Foo App'}).querySelector('.brand-mark')).toHaveTextContent('FA');
        expect(screen.getByText('Foo App', {selector: '.eyebrow'})).toBeVisible();
    });

    it('provides compact and desktop navigation with one page heading', () => {
        renderApp('/polls');

        expect(screen.getAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(2);
        expect(screen.getAllByRole('link', {name: 'Startseite'})).toHaveLength(3);
        expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
        expect(screen.getByRole('heading', {name: 'Öffentliche Abstimmungen', level: 1})).toBeVisible();
    });

    it('öffnet den gemeinsamen Identitätseditor über die Shell-Identität', async () => {
        vi.spyOn(apiClient, 'getIdentity').mockResolvedValue({userID: 'alice'});
        const changeIdentity = vi.spyOn(apiClient, 'changeIdentity').mockResolvedValue(undefined);

        renderApp('/polls');

        const sidebar = screen.getByRole('complementary', {name: 'Identität'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Identität bearbeiten'}));
        fireEvent.change(screen.getByLabelText('Neue Identität'), {target: {value: 'Bob'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        fireEvent.click(screen.getByRole('button', {name: 'Änderung bestätigen'}));

        await vi.waitFor(() => expect(changeIdentity).toHaveBeenCalledWith({userID: 'Bob'}));
    });

    it('renders the home navigation in German by default', () => {
        renderApp();

        expect(screen.getByRole('heading', {name: 'JustVotes'})).toBeVisible();
        const navigation = screen.getAllByRole('navigation', {name: 'Hauptnavigation'})[0];
        expect(within(navigation).getByRole('link', {name: 'Abstimmungen'})).toBeVisible();
        expect(within(navigation).queryByRole('link', {name: 'Admin'})).toBeNull();
        expect(within(screen.getByRole('contentinfo')).getByRole('link', {name: 'Admin'})).toHaveAttribute('href', '/admin');
        expect(screen.getByRole('button', {name: 'English anzeigen'})).toBeVisible();
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
            const {unmount} = renderApp(route);
            expect(screen.getAllByRole('main').at(-1)).toBeVisible();
            unmount();
        }

        renderApp('/not-a-route');
        expect(screen.getByRole('heading', {name: 'Seite nicht gefunden', level: 1})).toBeVisible();
    });

    it('persists language and selected theme without using identity storage', () => {
        renderApp();

        fireEvent.click(screen.getAllByRole('button', {name: 'English anzeigen'})[0]);
        expect(screen.getByRole('button', {name: 'Show German'})).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: 'Choose theme'}));
        fireEvent.click(screen.getByRole('radio', {name: 'Dark'}));

        expect(screen.getByRole('heading', {name: 'Home'})).toBeVisible();
        expect(window.localStorage.getItem('justvotes-locale')).toBe('en');
        expect(window.localStorage.getItem('justvotes-theme')).toBe('dark');
        expect(window.localStorage.getItem('identity')).toBeNull();
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    it('falls back to light for an unknown stored theme', () => {
        window.localStorage.setItem('justvotes-theme', 'sepia');

        renderApp();

        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
        expect(window.localStorage.getItem('justvotes-theme')).toBe('light');
    });

    it('supports the Sepia theme across the shared shell', () => {
        renderApp();

        fireEvent.click(screen.getByRole('button', {name: 'Theme auswählen'}));
        fireEvent.click(screen.getByRole('radio', {name: 'Sepia'}));

        expect(document.documentElement).toHaveAttribute('data-theme', 'claude');
        expect(window.localStorage.getItem('justvotes-theme')).toBe('claude');
    });

    it('supports the Eco theme across the shared shell', () => {
        renderApp();

        fireEvent.click(screen.getByRole('button', {name: 'Theme auswählen'}));
        fireEvent.click(screen.getByRole('radio', {name: 'Eco'}));

        expect(document.documentElement).toHaveAttribute('data-theme', 'openai');
        expect(window.localStorage.getItem('justvotes-theme')).toBe('openai');
    });

    it('keeps the internal theme identifier for stored preferences', () => {
        window.localStorage.setItem('justvotes-theme', 'claude');

        renderApp();

        expect(document.documentElement).toHaveAttribute('data-theme', 'claude');
        expect(window.localStorage.getItem('justvotes-theme')).toBe('claude');
    });

    it('opens an exclusive theme menu and closes it after selection or Escape', () => {
        renderApp();

        const button = screen.getByRole('button', {name: 'Theme auswählen'});
        fireEvent.click(button);

        expect(screen.getByRole('radiogroup', {name: 'Theme auswählen'})).toBeVisible();
        expect(screen.getByRole('radio', {name: 'Hell'})).toBeChecked();
        expect(screen.getByRole('radio', {name: 'Dunkel'})).not.toBeChecked();
        expect(document.activeElement).toBe(screen.getByRole('radio', {name: 'Hell'}));

        fireEvent.click(screen.getByRole('radio', {name: 'Dunkel'}));
        expect(screen.queryByRole('radiogroup', {name: 'Theme auswählen'})).toBeNull();
        expect(button).toHaveFocus();

        fireEvent.click(button);
        fireEvent.click(document.body);
        expect(screen.queryByRole('radiogroup', {name: 'Theme auswählen'})).toBeNull();
        expect(button).toHaveFocus();

        fireEvent.click(button);
        fireEvent.click(screen.getByRole('radio', {name: 'Dunkel'}));
        expect(screen.queryByRole('radiogroup', {name: 'Theme auswählen'})).toBeNull();

        fireEvent.click(button);
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.queryByRole('radiogroup', {name: 'Theme auswählen'})).toBeNull();
        expect(button).toHaveFocus();

        fireEvent.click(button);
        fireEvent.click(screen.getAllByRole('link', {name: 'Abstimmungen'})[0]);
        expect(screen.queryByRole('radiogroup', {name: 'Theme auswählen'})).toBeNull();
        expect(button).toHaveFocus();
    });

    it('updates the selected theme when another tab changes it', async () => {
        renderApp();

        fireEvent.click(screen.getByRole('button', {name: 'Theme auswählen'}));
        expect(screen.getByRole('radio', {name: 'Hell'})).toBeChecked();
        window.dispatchEvent(new StorageEvent('storage', {key: 'justvotes-theme', newValue: 'dark'}));

        await vi.waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'));
        expect(screen.getByRole('radio', {name: 'Dunkel'})).toBeChecked();

        window.dispatchEvent(new StorageEvent('storage', {key: 'justvotes-theme', newValue: 'unknown'}));
        await vi.waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'));
        window.dispatchEvent(new StorageEvent('storage', {key: null, newValue: null}));
        await vi.waitFor(() => expect(screen.getByRole('radio', {name: 'Hell'})).toBeChecked());
    });

    it('falls back to light when theme storage cannot be read', () => {
        vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
            if (key === 'justvotes-theme') throw new Error('storage blocked');
            return null;
        });

        renderApp();

        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    it('keeps theme selection available when theme storage cannot be written', () => {
        renderApp();
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
            throw new Error('storage blocked');
        });

        fireEvent.click(screen.getByRole('button', {name: 'Theme auswählen'}));
        fireEvent.click(screen.getByRole('radio', {name: 'Dunkel'}));

        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    it('renders explicit data states at the shared route seam', () => {
        render(
            <I18nProvider>
                <div>
                    <RouteState status="loading"/>
                    <RouteState status="empty"/>
                    <RouteState status="error"/>
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
                        <ThrowingComponent error={error}/>
                    </AppErrorBoundary>
                </I18nProvider>
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', {name: 'Etwas ist schiefgelaufen'})).toBeVisible();
        vi.restoreAllMocks();
    });

    it('exposes dismissible status notifications', () => {
        render(
            <MemoryRouter>
                <I18nProvider>
                    <ToastProvider>
                        <ToastHarness/>
                    </ToastProvider>
                </I18nProvider>
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Zeige Nachricht'}));
        expect(screen.getByRole('status')).toHaveTextContent('Gespeichert');
        fireEvent.click(screen.getByRole('button', {name: 'Schließen'}));
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

        expect(await screen.findByRole('heading', {name: 'Administration', level: 1})).toBeVisible();
    });

    it('shows only authenticated admin areas in desktop and mobile shell navigation', async () => {
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        renderApp('/admin/polls');

        expect(await screen.findByRole('heading', {name: 'Abstimmungen', level: 3})).toBeVisible();
        const navigations = screen.getAllByRole('navigation', {name: 'Admin-Navigation'})
            .filter((navigation) => navigation.classList.contains('sidebar-navigation') || navigation.classList.contains('mobile-navigation'));
        expect(navigations).toHaveLength(2);
        expect(screen.getAllByRole('navigation', {name: 'Admin-Navigation'})).toHaveLength(2);
        for (const navigation of navigations) {
            expect(within(navigation).getAllByRole('link')).toHaveLength(4);
            expect(within(navigation).getByRole('link', {name: 'Abstimmungen'})).toHaveAttribute('aria-current', 'page');
            expect(within(navigation).queryByRole('link', {name: 'Startseite'})).toBeNull();
        }
        expect(screen.queryAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(0);
        expect(screen.getByRole('link', {name: 'Startseite'})).toHaveAttribute('href', '/');
        expect(screen.queryByRole('link', {name: 'JustVotes'})).toBeNull();
    });

    it('marks votes as current for the admin root route', async () => {
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({votes: [], page: 0, size: 50, totalElements: 0});
        renderApp('/admin');

        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 3})).toBeVisible();
        const sidebar = screen.getAllByRole('navigation', {name: 'Admin-Navigation'})
            .find((navigation) => navigation.classList.contains('sidebar-navigation'));
        expect(sidebar).toBeDefined();
        expect(within(sidebar!).getByRole('link', {name: 'Stimmen'})).toHaveAttribute('aria-current', 'page');
    });

    it('localizes the authenticated admin shell and supports dark mode', async () => {
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        renderApp('/admin/polls');

        expect(await screen.findByRole('heading', {name: 'Abstimmungen', level: 3})).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: 'English anzeigen'}));

        const adminNavigation = screen.getAllByRole('navigation', {name: 'Administration navigation'})
            .find((navigation) => navigation.classList.contains('sidebar-navigation'));
        expect(within(adminNavigation!).getByRole('link', {name: 'Polls'})).toBeVisible();
        expect(within(adminNavigation!).getByRole('link', {name: 'Polls'})).toHaveAttribute('aria-current', 'page');
        fireEvent.click(screen.getByRole('button', {name: 'Choose theme'}));
        fireEvent.click(screen.getByRole('radio', {name: 'Dark'}));
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    it('does not expose protected shell navigation on the login screen', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockRejectedValue(problemError({status: 401, code: 'unauthorized'}, 401));
        renderApp('/admin/polls');

        expect(await screen.findByLabelText('Benutzername')).toBeVisible();
        expect(screen.queryAllByRole('navigation', {name: 'Admin-Navigation'})).toHaveLength(0);
        expect(screen.queryAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(0);
        expect(screen.queryByRole('link', {name: 'JustVotes'})).toBeNull();
    });

    it('returns to the in-memory target route after login', async () => {
        sessionCoordinator.requireLogin('/polls');
        vi.spyOn(apiClient, 'login').mockResolvedValue(undefined);
        renderApp('/admin');

        fireEvent.change(screen.getByLabelText('Benutzername'), {target: {value: 'admin'}});
        fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: 'secret'}});
        fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));

        expect(await screen.findByRole('heading', {name: 'Öffentliche Abstimmungen', level: 1})).toBeVisible();
    });
});

function ThrowingComponent({error}: { error: Error }): never {
    throw error;
}

function ToastHarness() {
    const {showToast} = useToast();
    return <button type="button" onClick={() => showToast('Gespeichert', 'success')}>Zeige Nachricht</button>;
}
