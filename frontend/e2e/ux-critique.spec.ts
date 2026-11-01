import AxeBuilder from '@axe-core/playwright';
import {expect, type Page, test} from '@playwright/test';

// Spec 009: checks from the design critique that only a real browser layout can answer.

type Session = {email: string; role: 'user' | 'admin'; identity: string | null; passwordChangeRequired: boolean};

const admin: Session = {email: 'admin@example.test', role: 'admin', identity: null, passwordChangeRequired: false};
const user: Session = {email: 'alice@example.test', role: 'user', identity: 'Anna', passwordChangeRequired: false};

const options = Array.from({length: 25}, (_, index) => ({number: index + 1, text: `Option ${String(index + 1).padStart(2, '0')}`}));

function expiredPoll() {
    return {
        id: 'p_v1_expired', title: 'Flamongo - Freitag', visibility: 'public', state: 'expired',
        createdAt: '2026-09-06T17:48:00.000Z', endsAt: '2026-10-31T18:50:00.000Z', totalVotes: 1,
        templateGroup: {id: 'g_v1_members', name: 'Alle Mitglieder', description: '', kind: 'members'},
        templateSnapshotOptions: options, options,
    };
}

function expiredResults() {
    return {
        id: 'p_v1_expired', title: 'Flamongo - Freitag', visibility: 'public', state: 'expired',
        createdAt: '2026-09-06T17:48:00.000Z', endsAt: '2026-10-31T18:50:00.000Z', totalVotes: 1,
        options: options.map((option) => {
            const votes = [];
            if (option.number === 2) votes.push({userID: 'Anna', votedAt: '2026-10-31T08:22:43.000Z'});
            return {...option, voteCount: votes.length, votes};
        }),
    };
}

function adminPoll(id: string, title: string, state: string, visibility: string, endsAt: string | null) {
    return {
        id, title, state, visibility, createdAt: '2026-09-01T12:00:00.000Z', endsAt, totalVotes: 0,
        templateGroup: {id: 'g_v1_group', name: 'Board', description: ''},
        templateSnapshotOptions: options, options,
    };
}

async function mockBackend(page: Page, session: Session | null) {
    await page.route('**/api/v1/**', (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/v1/session') {
            if (session) return route.fulfill({json: session});
            return route.fulfill({status: 401, json: {status: 401, code: 'authentication-required'}});
        }
        if (path.endsWith('/csrf')) return route.fulfill({json: {token: 'test', headerName: 'X-XSRF-TOKEN'}});
        if (path === '/api/v1/admin/votes') return route.fulfill({json: {votes: [], page: 0, size: 50, totalElements: 0}});
        if (path === '/api/v1/admin/polls') return route.fulfill({json: [
            adminPoll('p_v1_deleted', 'Titel', 'deleted', 'public', '2026-09-25T19:50:00.000Z'),
            adminPoll('p_v1_expired', 'Flamongo - Freitag', 'expired', 'public', '2026-10-31T18:50:00.000Z'),
            adminPoll('p_v1_draft', 'blah', 'draft', 'private', null),
        ]});
        if (path === '/api/v1/admin/template-catalog/templates') return route.fulfill({json: [{id: 't_v1_one', name: 'Benedict Stieber'}]});
        if (path.endsWith('/polls/p_v1_expired/results')) return route.fulfill({json: expiredResults()});
        if (path.endsWith('/polls/p_v1_expired')) return route.fulfill({json: expiredPoll()});
        if (path.endsWith('/identity/votes')) return route.fulfill({json: {userID: 'Anna', votes: []}});
        return route.fulfill({json: []});
    });
}

async function violations(page: Page) {
    const result = await new AxeBuilder({page}).withRules(['label', 'color-contrast']).analyze();
    return result.violations.map(({id, nodes}) => ({id, targets: nodes.map((node) => node.target.join(' '))}));
}

test('every administration area names itself in heading, header path and tab title', async ({page}) => {
    await mockBackend(page, admin);
    const areas = [
        ['/admin/votes', 'Stimmen'], ['/admin/polls', 'Abstimmungen'], ['/admin/groups', 'Vorlagengruppen'],
        ['/admin/templates', 'Optionsvorlagen'], ['/admin/accounts', 'Konten'], ['/admin/invitations', 'Einladungen'],
    ] as const;
    for (const [path, title] of areas) {
        await page.goto(path);
        await expect(page.getByRole('heading', {level: 1})).toHaveText(title);
        await expect(page.locator('.header-context')).toContainText('Administration');
        await expect(page.locator('.header-title')).toHaveText(title);
        await expect(page).toHaveTitle(`${title} · JustVotes`);
        await expect(page.getByText('Anmeldung und Verwaltung.')).toHaveCount(0);
    }
});

for (const viewport of [{width: 1280, height: 860}, {width: 375, height: 812}]) {
    test(`an expired poll offers its results without scrolling at ${viewport.width}px`, async ({page}) => {
        await page.setViewportSize(viewport);
        await mockBackend(page, user);

        await page.goto('/poll/p_v1_expired');

        await expect(page.getByText('Diese Abstimmung ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.')).toBeInViewport();
        await expect(page.getByRole('link', {name: 'Ergebnisse ansehen'})).toBeInViewport();
        await expect(page.getByRole('radio')).toHaveCount(0);
        await expect(page.locator('.closed-option-list li.current')).toContainText('Eigene Stimme');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
}

test('the admin poll list shows three polls collapsed without scrolling', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 860});
    await mockBackend(page, admin);

    await page.goto('/admin/polls');

    for (const title of ['Titel', 'Flamongo - Freitag', 'blah']) {
        const toggle = page.getByRole('button', {name: title, exact: true});
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toBeInViewport();
    }
    await page.getByRole('button', {name: 'Flamongo - Freitag'}).click();
    const row = page.locator('.poll-admin-card.expanded');
    await expect(row.getByText('Option 10', {exact: true})).toBeVisible();
    await expect(row.getByText('Option 11', {exact: true})).toHaveCount(0);
    await expect(row.getByRole('button', {name: 'Alle 25 Optionen anzeigen'})).toBeVisible();
});

test('login, option templates, poll and results have labelled fields and sufficient text contrast', async ({page}) => {
    await mockBackend(page, null);
    await page.goto('/login');
    await expect(page.getByRole('button', {name: 'Anmelden'})).toBeEnabled();
    expect(await violations(page)).toEqual([]);
    await page.unrouteAll();

    await mockBackend(page, admin);
    await page.goto('/admin/templates');
    await expect(page.getByText('Benedict Stieber')).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.unrouteAll();

    await mockBackend(page, user);
    await page.goto('/poll/p_v1_expired');
    await expect(page.getByRole('link', {name: 'Ergebnisse ansehen'})).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.goto('/poll/results/p_v1_expired');
    await expect(page.getByRole('link', {name: 'Stimmen ansehen: Option 02'})).toBeVisible();
    expect(await violations(page)).toEqual([]);
});
