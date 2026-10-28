import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page, type Route} from '@playwright/test';

type Session = {accountName: string; role: 'user' | 'admin'; identity: string | null; passwordChangeRequired: boolean};

const user: Session = {accountName: 'anna', role: 'user', identity: 'Anna', passwordChangeRequired: false};
const admin: Session = {accountName: 'systemadmin', role: 'admin', identity: null, passwordChangeRequired: false};
const poll = {
    id: 'p_v1_auth', title: 'Signed-in poll', visibility: 'public', state: 'active',
    createdAt: '2026-10-27T10:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: 0,
    options: [{number: 1, text: 'Ja'}, {number: 2, text: 'Nein'}],
    templateSnapshotOptions: [{number: 1, text: 'Ja'}, {number: 2, text: 'Nein'}],
    templateGroup: {id: 'g_v1_auth', name: 'Gruppe', description: ''},
};

async function seriousViolations(page: Page) {
    const results = await new AxeBuilder({page}).analyze();
    return results.violations.filter(({impact}) => impact === 'critical' || impact === 'serious');
}

/**
 * A small stateful fake of the session API; everything else is answered by the given handler.
 */
async function fakeBackend(page: Page, state: {session: Session | null}, handler: (route: Route) => unknown = (route) => route.fulfill({json: []})) {
    await page.route('**/api/v1/**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/v1/csrf') return route.fulfill({json: {token: 'csrf-token', headerName: 'X-XSRF-TOKEN'}});
        if (path === '/api/v1/session') {
            if (state.session) return route.fulfill({json: state.session});
            return route.fulfill({status: 401, json: {status: 401, code: 'authentication-required'}});
        }
        if (path === '/api/v1/session/logout') {
            state.session = null;
            return route.fulfill({status: 204});
        }
        if (!state.session && !path.startsWith('/api/v1/invitations/') && path !== '/api/v1/session/login') {
            return route.fulfill({status: 401, json: {status: 401, code: 'authentication-required'}});
        }
        return handler(route);
    });
}

test('anonymous visitors only see the login page; users sign in, vote and sign out', async ({page}) => {
    const state: {session: Session | null} = {session: null};
    const votes: number[] = [];
    await fakeBackend(page, state, async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/v1/session/login') {
            if (request.postDataJSON().password !== 'correct-horse-battery') {
                return route.fulfill({status: 401, json: {status: 401, code: 'invalid-credentials'}});
            }
            state.session = user;
            return route.fulfill({json: user});
        }
        if (path === '/api/v1/polls/p_v1_auth') return route.fulfill({json: poll});
        if (path === '/api/v1/polls/p_v1_auth/results') return route.fulfill({status: 403, json: {status: 403, code: 'results-not-available'}});
        if (path === '/api/v1/polls/p_v1_auth/votes') {
            votes.push(request.postDataJSON().optionNumber);
            return route.fulfill({json: {status: 'created', optionNumber: request.postDataJSON().optionNumber}});
        }
        return route.fulfill({json: []});
    });

    await page.goto('/poll/p_v1_auth');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', {name: 'Anmelden', level: 1})).toBeVisible();
    await expect(page.getByText('Signed-in poll')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel('Kontoname').fill('anna');
    await page.getByLabel('Passwort').fill('wrong-password');
    await page.getByRole('button', {name: 'Anmelden'}).click();
    await expect(page.getByRole('alert')).toHaveText('Kontoname oder Passwort ist falsch.');

    await page.getByLabel('Passwort').fill('correct-horse-battery');
    await page.getByRole('button', {name: 'Anmelden'}).click();
    await expect(page.getByRole('heading', {name: 'Signed-in poll', level: 1})).toBeVisible();
    await expect(page).toHaveURL(/\/poll\/p_v1_auth$/);
    await expect(page.locator('.sidebar .account-panel')).toContainText('Anna');

    await page.getByRole('radio', {name: 'Nein'}).click();
    await page.getByRole('button', {name: 'Stimme abgeben: Nein'}).click();
    await expect(page.getByText('Stimme abgegeben.')).toBeVisible();
    expect(votes).toEqual([2]);

    await page.locator('.sidebar .account-panel').getByRole('button', {name: 'Abmelden'}).click();
    await expect(page.getByLabel('Kontoname')).toBeVisible();
    await expect(page.getByText('Deine Sitzung ist abgelaufen')).toHaveCount(0);
});

test('the administrator only sees the administration', async ({page}) => {
    const state: {session: Session | null} = {session: admin};
    await fakeBackend(page, state, (route) => {
        if (route.request().url().includes('/admin/votes?')) return route.fulfill({json: {votes: [], page: 0, size: 50, totalElements: 0}});
        return route.fulfill({json: []});
    });

    await page.goto('/polls');
    await expect(page).toHaveURL(/\/admin\/votes$/);
    await expect(page.getByRole('navigation', {name: 'Admin-Navigation'})).toBeVisible();
    await expect(page.getByRole('navigation', {name: 'Hauptnavigation'})).toHaveCount(0);
    await page.getByRole('link', {name: 'Konten'}).click();
    await expect(page.getByRole('heading', {name: 'Konten', level: 3, exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Einladungen'}).click();
    await expect(page.getByRole('heading', {name: 'Person einladen', level: 4})).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
});

test('an invited person completes the account from the link (component-level, mocked API)', async ({page}) => {
    const state: {session: Session | null} = {session: null};
    let accepted: Record<string, string> | null = null;
    await fakeBackend(page, state, async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/v1/invitations/inspection') {
            expect(request.postDataJSON()).toEqual({token: 'invite-token'});
            return route.fulfill({json: {email: 'anna@example.test', expiresAt: '2026-11-03T10:00:00.000Z'}});
        }
        if (path === '/api/v1/invitations/acceptance') {
            accepted = request.postDataJSON();
            state.session = user;
            return route.fulfill({json: user});
        }
        return route.fulfill({json: []});
    });

    await page.goto('/invitation#token=invite-token');
    await expect(page.getByText('anna@example.test')).toBeVisible();
    await expect(page).toHaveURL(/\/invitation$/);
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel('Kontoname').fill('anna');
    await page.getByLabel('Identität').fill('Anna');
    await page.getByLabel('Neues Passwort', {exact: true}).fill('correct-horse-battery');
    await page.getByLabel('Neues Passwort wiederholen').fill('correct-horse-battery');
    await page.getByRole('button', {name: 'Konto anlegen'}).click();

    await expect(page).toHaveURL(/\/polls$/);
    expect(accepted).toEqual({token: 'invite-token', username: 'anna', userID: 'Anna', password: 'correct-horse-battery'});
});

test('a signed-in person is asked to sign out before accepting an invitation', async ({page}) => {
    const state: {session: Session | null} = {session: admin};
    await fakeBackend(page, state, (route) => {
        if (new URL(route.request().url()).pathname === '/api/v1/invitations/inspection') {
            return route.fulfill({json: {email: 'anna@example.test', expiresAt: '2026-11-03T10:00:00.000Z'}});
        }
        return route.fulfill({json: []});
    });

    await page.goto('/invitation#token=invite-token');
    await expect(page.getByText('Du bist als systemadmin angemeldet.')).toBeVisible();
    await page.getByRole('button', {name: 'Abmelden'}).first().click();
    await expect(page.getByText('anna@example.test')).toBeVisible();
});

test('a one-time password forces a new password before anything else', async ({page}) => {
    const state: {session: Session | null} = {session: {...user, passwordChangeRequired: true}};
    let changed = false;
    await fakeBackend(page, state, async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/v1/session/password') {
            changed = true;
            state.session = user;
            return route.fulfill({status: 204});
        }
        return route.fulfill({json: []});
    });

    await page.goto('/polls');
    await expect(page).toHaveURL(/\/password$/);
    await expect(page.getByText(/Einmalpasswort erhalten/)).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel('Aktuelles Passwort').fill('Ab3dEf6hJk8mNp2q');
    await page.getByLabel('Neues Passwort', {exact: true}).fill('my-own-new-password');
    await page.getByLabel('Neues Passwort wiederholen').fill('my-own-new-password');
    await page.getByRole('button', {name: 'Passwort speichern'}).click();

    await expect(page).toHaveURL(/\/polls$/);
    expect(changed).toBe(true);
});
