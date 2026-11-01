import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page, type Route} from '@playwright/test';

type Session = {email: string; role: 'user' | 'admin'; identity: string | null; passwordChangeRequired: boolean};

const user: Session = {email: 'anna@example.test', role: 'user', identity: 'Anna', passwordChangeRequired: false};
const admin: Session = {email: 'systemadmin@example.test', role: 'admin', identity: null, passwordChangeRequired: false};
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

    await page.getByLabel('E-Mail-Adresse').fill('anna@example.test');
    await page.getByLabel('Passwort').fill('wrong-password');
    await page.getByRole('button', {name: 'Anmelden'}).click();
    await expect(page.getByRole('alert')).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');

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
    await expect(page.getByLabel('E-Mail-Adresse')).toBeVisible();
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

    await expect(page.getByLabel('E-Mail-Adresse')).toHaveValue('anna@example.test');
    await page.getByLabel('Anzeigename').fill('Anna');
    await page.getByLabel('Neues Passwort', {exact: true}).fill('correct-horse-battery');
    await page.getByLabel('Neues Passwort wiederholen').fill('correct-horse-battery');
    await page.getByRole('button', {name: 'Konto anlegen'}).click();

    await expect(page).toHaveURL(/\/polls$/);
    expect(accepted).toEqual({token: 'invite-token', userID: 'Anna', password: 'correct-horse-battery'});
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
    await expect(page.getByText('Du bist als systemadmin@example.test angemeldet.')).toBeVisible();
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

const managedAccounts = [
    {accountId: 'a_v1_1', email: 'systemadmin@example.test', role: 'admin', identity: null, status: 'active', passwordChangeRequired: false, createdAt: '2026-10-27T10:00:00Z'},
    {accountId: 'a_v1_2', email: 'anna.mustermann@example.test', role: 'user', identity: 'Anna Mustermann', status: 'active', passwordChangeRequired: true, createdAt: '2026-10-28T10:00:00Z'},
];
const openInvitations = [
    {invitationId: 'i_v1_1', email: 'dieter.sehr-lange-adresse@example.test', status: 'open', deliveryFailed: true, issuedAt: '2026-10-29T10:00:00Z', expiresAt: '2026-11-05T10:00:00Z'},
];

async function administrationBackend(page: Page) {
    await fakeBackend(page, {session: admin}, (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/v1/admin/accounts') return route.fulfill({json: managedAccounts});
        if (path === '/api/v1/admin/invitations') return route.fulfill({json: openInvitations});
        return route.fulfill({json: []});
    });
}

for (const width of [320, 375, 768]) {
    test(`accounts and invitations become readable cards at ${width}px`, async ({page}) => {
        await page.setViewportSize({width, height: 800});
        await administrationBackend(page);

        for (const [path, title, labels] of [
            ['/admin/accounts', 'anna.mustermann@example.test', ['Anzeigename', 'Rolle', 'Status']],
            ['/admin/invitations', 'dieter.sehr-lange-adresse@example.test', ['Status', 'Versendet', 'Gültig bis']],
        ] as const) {
            await page.goto(path);
            const card = page.getByRole('row').filter({hasText: title});
            await expect(card).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

            const cardBox = await card.boundingBox();
            expect(await card.evaluate((row) => getComputedStyle(row).display)).toBe('block');
            for (const label of labels) {
                const cell = card.locator(`td[data-label="${label}"]`);
                // The column name is rendered from data-label (Firefox reports the unresolved attr() here).
                expect(await cell.evaluate((element) => getComputedStyle(element, '::before').content)).not.toBe('none');
                // Values keep a usable width instead of being squeezed to single letters.
                expect((await cell.boundingBox())!.width).toBeGreaterThan(cardBox!.width * .7);
            }
            for (const button of await card.getByRole('button').all()) {
                const box = (await button.boundingBox())!;
                expect(box.x).toBeGreaterThanOrEqual(cardBox!.x);
                expect(box.x + box.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 0.5);
            }
        }
        expect(await seriousViolations(page)).toEqual([]);
    });
}

test('accounts stay a table on a wide desktop', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await administrationBackend(page);
    await page.goto('/admin/accounts');
    const row = page.getByRole('row').filter({hasText: 'anna.mustermann@example.test'});
    await expect(row).toBeVisible();
    expect(await row.evaluate((element) => getComputedStyle(element).display)).toBe('table-row');
    await expect(page.getByRole('columnheader', {name: 'Anzeigename'})).toBeVisible();
});

test('the mobile header only offers a menu to signed-in people', async ({page}) => {
    await page.setViewportSize({width: 375, height: 800});
    const state: {session: Session | null} = {session: null};
    await fakeBackend(page, state);
    await page.goto('/login');
    await expect(page.getByLabel('E-Mail-Adresse')).toBeVisible();
    await expect(page.locator('.mobile-menu-button')).toHaveCount(0);

    state.session = {...user, passwordChangeRequired: true};
    await page.goto('/password');
    await page.locator('.mobile-menu-button').click();
    const panel = page.locator('#mobile-menu-panel');
    await expect(panel.getByText('anna@example.test')).toBeVisible();
    await expect(panel.getByRole('button', {name: 'Abmelden'})).toBeVisible();
    await expect(panel.getByRole('navigation')).toHaveCount(0);
});

const importPreview = {
    unreadableEntries: 1,
    contacts: [
        {position: 1, name: 'Anna Beispiel', email: 'anna@example.test', outcome: 'invite'},
        {position: 2, name: 'Bert Muster', email: 'bert@example.test', outcome: 'renew'},
        {position: 3, name: 'Jörg Ümlaut-Straß', email: 'joerg@example.test', outcome: 'invite'},
        {position: 4, name: 'Ohne Adresse', email: null, outcome: 'missing-email'},
        {position: 5, name: 'Kaputt', email: 'kein-at-zeichen', outcome: 'invalid-email'},
        {position: 6, name: 'Anna Doppelt', email: 'anna@example.test', outcome: 'duplicate-in-file'},
    ],
};

for (const width of [320, 375, 1280]) {
    test(`imports contacts from a vCard file at ${width}px`, async ({page}) => {
        await page.setViewportSize({width, height: 900});
        let uploaded = '';
        let imported: {locale: string; contacts: {email: string; name: string | null}[]} | null = null;
        await fakeBackend(page, {session: admin}, async (route) => {
            const request = route.request();
            const path = new URL(request.url()).pathname;
            if (path === '/api/v1/admin/invitations/contact-import/preview') {
                uploaded = request.postData() ?? '';
                expect(request.headers()['content-type']).toContain('text/vcard');
                return route.fulfill({json: importPreview});
            }
            if (path === '/api/v1/admin/invitations/contact-import') {
                imported = request.postDataJSON();
                return route.fulfill({json: {invited: 1, renewed: 1, deliveryFailed: 0, entries: [
                    {email: 'anna@example.test', outcome: 'invited'},
                    {email: 'bert@example.test', outcome: 'renewed'},
                ]}});
            }
            return route.fulfill({json: []});
        });

        await page.goto('/admin/invitations');
        await page.getByLabel('Kontaktdatei (.vcf)').setInputFiles('e2e/fixtures/contacts.vcf');

        await expect(page.getByText('1 Eintrag der Datei konnte nicht gelesen werden.')).toBeVisible();
        await expect(page.getByText('Jörg Ümlaut-Straß')).toBeVisible();
        await expect(page.getByText('Ungültige E-Mail-Adresse')).toBeVisible();
        expect(uploaded).toContain('BEGIN:VCARD');
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        expect(await seriousViolations(page)).toEqual([]);

        await page.getByRole('checkbox', {name: 'Jörg Ümlaut-Straß einladen'}).uncheck();
        await page.getByLabel('Sprache der Einladung').last().selectOption('en');
        await page.getByRole('button', {name: '2 einladen'}).click();

        await expect(page.getByText('1 eingeladen, 1 erneuert, 0 übersprungen.')).toBeVisible();
        expect(imported).toEqual({locale: 'en', contacts: [
            {email: 'anna@example.test', name: 'Anna Beispiel'},
            {email: 'bert@example.test', name: 'Bert Muster'},
        ]});
    });
}

test('an invitation from a contact import suggests the display name', async ({page}) => {
    const state: {session: Session | null} = {session: null};
    await fakeBackend(page, state, (route) => {
        if (new URL(route.request().url()).pathname === '/api/v1/invitations/inspection') {
            return route.fulfill({json: {email: 'anna@example.test', expiresAt: '2026-11-03T10:00:00.000Z', suggestedUserID: 'Anna Beispiel'}});
        }
        return route.fulfill({json: []});
    });

    await page.goto('/invitation#token=invite-token');
    await expect(page.getByLabel('Anzeigename')).toHaveValue('Anna Beispiel');
    await page.getByLabel('Anzeigename').fill('Anna B.');
    await expect(page.getByLabel('Anzeigename')).toHaveValue('Anna B.');
});
