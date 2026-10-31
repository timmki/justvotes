import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {I18nProvider} from '../shared/i18n/I18nProvider';
import {apiClient, sessionCoordinator} from '../shared/api/client';
import {problemError} from '../shared/api/errors';
import {queryClient} from '../shared/api/queryClient';
import {App, AppErrorBoundary, RouteState, ToastProvider, useToast} from './App';
import {adminSession, signIn, userSession} from '../test/sessions';

afterEach(() => {
    cleanup();
    sessionCoordinator.consumeReturnRoute();
    sessionCoordinator.consumeLoggedOut();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('lang');
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    queryClient.clear();
});

beforeEach(() => {
    vi.spyOn(apiClient, 'getPublicPolls').mockResolvedValue([]);
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            clear: () => values.clear(),
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => values.set(key, value),
        },
    });
    signIn(userSession('alice'));
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

        const [sidebarBrand, headerBrand] = screen.getAllByRole('link', {name: 'Foo App'});
        expect(sidebarBrand).toBeVisible();
        expect(headerBrand).toBeVisible();
        expect(sidebarBrand.querySelector('.brand-mark')).toHaveTextContent('FA');
        expect(screen.getAllByText('Foo App')).toHaveLength(2);
    });

    it('provides compact and desktop navigation with one page heading', () => {
        renderApp('/polls');

        expect(screen.getAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(1);
        expect(screen.getAllByRole('link', {name: 'Startseite'})).toHaveLength(2);
        expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
        expect(screen.getByRole('heading', {name: 'Öffentliche Abstimmungen', level: 1})).toBeVisible();
    });

    it('renders the home navigation in German by default', () => {
        renderApp();

        expect(screen.getByRole('heading', {name: 'JustVotes'})).toBeVisible();
        const navigation = screen.getAllByRole('navigation', {name: 'Hauptnavigation'})[0];
        expect(within(navigation).getByRole('link', {name: 'Abstimmungen'})).toBeVisible();
        expect(within(navigation).queryByRole('link', {name: 'Admin'})).toBeNull();
        expect(screen.queryByRole('link', {name: 'Admin'})).toBeNull();
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
            '/profile',
            '/password',
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

    it('shows only the login page with an expiry notice after a session ended', async () => {
        signIn(null);
        sessionCoordinator.requireLogin('/admin/polls');
        renderApp('/admin');

        expect(await screen.findByRole('heading', {name: 'Anmelden', level: 1})).toBeVisible();
        expect(screen.getByRole('status', {name: ''})).toHaveTextContent('Deine Sitzung ist abgelaufen');
    });

    it('shows the login page for every protected route without a session', async () => {
        signIn(null);
        for (const route of ['/', '/polls', '/poll/example', '/profile', '/admin/polls', '/password']) {
            const {unmount} = renderApp(route);
            expect(await screen.findByLabelText('E-Mail-Adresse')).toBeVisible();
            expect(screen.queryAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(0);
            expect(screen.queryAllByRole('navigation', {name: 'Admin-Navigation'})).toHaveLength(0);
            unmount();
        }
    });

    it('shows only authenticated admin areas in desktop and mobile shell navigation', async () => {
        signIn(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        renderApp('/admin/polls');

        expect(await screen.findByRole('heading', {name: 'Abstimmungen', level: 3})).toBeVisible();
        const navigations = screen.getAllByRole('navigation', {name: 'Admin-Navigation'});
        expect(navigations).toHaveLength(1);
        expect(navigations[0]).toHaveClass('sidebar-navigation');
        for (const navigation of navigations) {
            expect(within(navigation).getAllByRole('link')).toHaveLength(6);
            expect(within(navigation).getByRole('link', {name: 'Abstimmungen'})).toHaveAttribute('aria-current', 'page');
            expect(within(navigation).getByRole('link', {name: 'Konten'})).toHaveAttribute('href', '/admin/accounts');
            expect(within(navigation).getByRole('link', {name: 'Einladungen'})).toHaveAttribute('href', '/admin/invitations');
            expect(within(navigation).queryByRole('link', {name: 'Startseite'})).toBeNull();
        }
        expect(screen.queryAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(0);
        expect(screen.queryByRole('link', {name: 'JustVotes'})).toBeNull();
    });

    it('marks votes as current for the admin root route', async () => {
        signIn(adminSession());
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({votes: [], page: 0, size: 50, totalElements: 0});
        renderApp('/admin');

        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 3})).toBeVisible();
        const sidebar = screen.getAllByRole('navigation', {name: 'Admin-Navigation'})
            .find((navigation) => navigation.classList.contains('sidebar-navigation'));
        expect(sidebar).toBeDefined();
        expect(within(sidebar!).getByRole('link', {name: 'Stimmen'})).toHaveAttribute('aria-current', 'page');
    });

    it('localizes the authenticated admin shell and supports dark mode', async () => {
        signIn(adminSession());
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

    it('keeps each role in its own area', async () => {
        signIn(adminSession());
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({votes: [], page: 0, size: 50, totalElements: 0});
        const admin = renderApp('/polls');
        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 3})).toBeVisible();
        admin.unmount();

        signIn(userSession('alice'));
        renderApp('/admin/accounts');
        expect(await screen.findByRole('heading', {name: 'Öffentliche Abstimmungen', level: 1})).toBeVisible();
        expect(screen.queryAllByRole('navigation', {name: 'Admin-Navigation'})).toHaveLength(0);
    });

    it('forces the password page while a one-time password is active', async () => {
        signIn(userSession('alice', {passwordChangeRequired: true}));
        renderApp('/polls');

        expect(await screen.findByRole('heading', {name: 'Passwort ändern', level: 1})).toBeVisible();
        expect(screen.getByText(/Einmalpasswort erhalten/)).toBeVisible();
        expect(screen.queryAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(0);
    });

    it('returns to the remembered route after login', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'getPoll').mockResolvedValue({
            id: 'example', title: 'Erinnerte Abstimmung', visibility: 'public', state: 'active',
            createdAt: '2026-08-01T10:00:00Z', endsAt: null, totalVotes: 0,
            templateGroup: {id: 'group-1', name: 'Gruppe', description: ''},
            templateSnapshotOptions: [{number: 1, text: 'Ja'}], options: [{number: 1, text: 'Ja'}],
        });
        vi.spyOn(apiClient, 'getPollResults').mockRejectedValue(problemError({code: 'results-not-available'}, 403));
        const login = vi.spyOn(apiClient, 'login').mockImplementation(async () => {
            signIn(userSession('alice'));
            return userSession('alice');
        });
        renderApp('/poll/example');

        fireEvent.change(await screen.findByLabelText('E-Mail-Adresse'), {target: {value: 'alice@example.test'}});
        fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: 'secret-password'}});
        fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));

        expect(await screen.findByRole('heading', {name: 'Erinnerte Abstimmung', level: 1})).toBeVisible();
        expect(login).toHaveBeenCalledWith({email: 'alice@example.test', password: 'secret-password'});
    });

    it('shows the uniform error for rejected credentials', async () => {
        signIn(null);
        vi.spyOn(apiClient, 'login').mockRejectedValue(problemError({code: 'invalid-credentials'}, 401));
        renderApp('/login');

        fireEvent.change(await screen.findByLabelText('E-Mail-Adresse'), {target: {value: 'alice@example.test'}});
        fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: 'wrong'}});
        fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail-Adresse oder Passwort ist falsch.');
        expect(screen.getByLabelText('E-Mail-Adresse')).toHaveFocus();
    });

    it('signs out from the account panel and shows the login page', async () => {
        const logout = vi.spyOn(apiClient, 'logout').mockImplementation(async () => {
            signIn(null);
        });
        renderApp('/polls');

        const sidebar = screen.getByRole('complementary', {name: 'JustVotes'});
        expect(within(sidebar).getByText('alice@example.test')).toBeVisible();
        // Let the background session probe of the first render settle before signing out.
        await waitFor(() => expect(queryClient.isFetching()).toBe(0));
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Abmelden'}));
        await waitFor(() => expect(logout).toHaveBeenCalled());

        expect(await screen.findByLabelText('E-Mail-Adresse')).toBeVisible();
        expect(logout).toHaveBeenCalledTimes(1);
    });
});

function ThrowingComponent({error}: { error: Error }): never {
    throw error;
}

function ToastHarness() {
    const {showToast} = useToast();
    return <button type="button" onClick={() => showToast('Gespeichert', 'success')}>Zeige Nachricht</button>;
}

describe('mobile menu', () => {
    it('opens the menu, closes it with Escape and returns focus to the menu button', async () => {
        renderApp('/polls');

        const menuButton = screen.getByRole('button', {name: 'Menü'});
        expect(menuButton).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(menuButton);
        expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        const panel = document.getElementById('mobile-menu-panel');
        expect(panel).not.toBeNull();
        expect(within(panel!).getByRole('navigation', {name: 'Menü'})).toBeVisible();

        fireEvent.keyDown(document, {key: 'Escape'});
        await waitFor(() => expect(document.getElementById('mobile-menu-panel')).toBeNull());
        expect(menuButton).toHaveFocus();
    });
});

describe('mobile menu landmarks and media query', () => {
    it('exposes one Hauptnavigation landmark before and after the menu opens', async () => {
        signIn(userSession('alice'));
        renderApp('/polls');

        expect(screen.getAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', {name: 'Menü'}));
        expect(screen.getAllByRole('navigation', {name: 'Hauptnavigation'})).toHaveLength(1);
    });

    it('closes the open menu when the viewport reaches desktop width', async () => {
        const listeners: Array<() => void> = [];
        const original = window.matchMedia;
        const query = {
            matches: false,
            addEventListener: (_type: string, listener: () => void) => { listeners.push(listener); },
            removeEventListener: () => undefined,
        };
        window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia;
        try {
            signIn(userSession('alice'));
            renderApp('/polls');
            fireEvent.click(screen.getByRole('button', {name: 'Menü'}));
            expect(document.getElementById('mobile-menu-panel')).not.toBeNull();

            act(() => {
                query.matches = true;
                listeners.forEach((listener) => listener());
            });

            await waitFor(() => expect(document.getElementById('mobile-menu-panel')).toBeNull());
        } finally {
            window.matchMedia = original;
        }
    });

    it('shows the read-only account identity instead of an identity editor', async () => {
        signIn(userSession('Älice #1'));
        renderApp('/');

        await screen.findByRole('region', {name: 'Im Fokus'});
        expect(document.querySelector('.identity-shell-editor')).toBeNull();
        expect(screen.queryByRole('button', {name: 'Identität ändern'})).toBeNull();
        expect(within(screen.getByRole('complementary', {name: 'JustVotes'})).getByText('Älice #1')).toBeVisible();
    });
});

describe('mobile menu backdrop and focus', () => {
    it('closes from the backdrop, locks scrolling and returns focus to the menu button', async () => {
        signIn(userSession('alice'));
        renderApp('/polls');

        const menuButton = screen.getByRole('button', {name: 'Menü'});
        fireEvent.click(menuButton);
        expect(document.documentElement).toHaveClass('menu-open');
        const backdrop = document.querySelector('.mobile-menu-backdrop');
        expect(backdrop).not.toBeNull();

        fireEvent.click(backdrop!);

        await waitFor(() => expect(document.getElementById('mobile-menu-panel')).toBeNull());
        expect(document.documentElement).not.toHaveClass('menu-open');
        expect(menuButton).toHaveFocus();
    });

    it('keeps Tab focus inside the open menu', async () => {
        signIn(userSession('alice'));
        renderApp('/polls');

        fireEvent.click(screen.getByRole('button', {name: 'Menü'}));
        const container = document.querySelector('.mobile-menu') as HTMLElement;
        const toggle = container.querySelector('.mobile-menu-button') as HTMLElement;
        const focusable = container.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        const last = focusable[focusable.length - 1];
        last.focus();

        fireEvent.keyDown(last, {key: 'Tab'});

        expect(toggle).toHaveFocus();
    });
});

describe('mobile menu close paths and exit phase', () => {
    it('closes the menu when a navigation link is chosen and unlocks scrolling', async () => {
        signIn(userSession('alice'));
        renderApp('/');

        fireEvent.click(screen.getByRole('button', {name: 'Menü'}));
        const panel = document.getElementById('mobile-menu-panel');
        expect(panel).not.toBeNull();
        fireEvent.click(within(panel!).getByRole('link', {name: 'Abstimmungen'}));

        await waitFor(() => expect(document.getElementById('mobile-menu-panel')).toBeNull());
        expect(document.documentElement).not.toHaveClass('menu-open');
    });

    it('keeps the panel mounted but inert while it fades out, then removes it', async () => {
        signIn(userSession('alice'));
        renderApp('/polls');

        fireEvent.click(screen.getByRole('button', {name: 'Menü'}));
        fireEvent.keyDown(document, {key: 'Escape'});

        const panel = document.getElementById('mobile-menu-panel');
        expect(panel).not.toBeNull();
        expect(panel).toHaveAttribute('data-open', 'false');
        expect(panel).toHaveAttribute('inert');
        await waitFor(() => expect(document.getElementById('mobile-menu-panel')).toBeNull());
    });

    it('removes the panel at once when reduced motion is requested', async () => {
        const original = window.matchMedia;
        window.matchMedia = vi.fn((query: string) => ({
            matches: query.includes('reduce'),
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => false,
        })) as unknown as typeof window.matchMedia;
        try {
            signIn(userSession('alice'));
            renderApp('/polls');

            fireEvent.click(screen.getByRole('button', {name: 'Menü'}));
            fireEvent.keyDown(document, {key: 'Escape'});

            await waitFor(() => expect(document.getElementById('mobile-menu-panel')).toBeNull(), {timeout: 100});
        } finally {
            window.matchMedia = original;
        }
    });
});
