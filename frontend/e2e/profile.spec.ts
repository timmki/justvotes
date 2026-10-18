import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

const vote = {poll: {id: 'p_v1_one', title: 'Personal transport', state: 'archived'}, option: {number: 2, text: 'Train'}, votedAt: '2026-09-15T12:00:00.000Z'};
test('missing identity supports keyboard setting and becomes a distinct no-vote state', async ({page}) => {
    let identity: string | null = null;
    await page.route('**/api/v1/**', route => {
        const request = route.request();
        if (request.url().endsWith('/identity/votes')) return route.fulfill({json: {userID: identity, votes: []}});
        if (request.url().endsWith('/csrf')) return route.fulfill({json: {token: 'test', headerName: 'X-XSRF-TOKEN'}});
        if (request.url().endsWith('/identity') && request.method() === 'POST') {
            identity = request.postDataJSON().userID;
            return route.fulfill({status: 204});
        }
        return route.fulfill({json: {userID: identity}});
    });
    await page.goto('/profile');
    await expect(page.getByText('Zuerst eine Identität setzen')).toBeVisible();
    const action = page.locator('.profile-page').getByRole('button', {name: 'Identität festlegen'});
    await action.focus();
    await page.keyboard.press('Enter');
    await page.locator('.profile-page').getByLabel('Neue Identität').fill('Alice');
    await page.locator('.profile-page').getByRole('button', {name: 'Speichern'}).click();
    await page.getByRole('button', {name: 'Änderung bestätigen'}).click();
    await expect(page.getByText('Keine aktuelle Stimme')).toBeVisible();
    await expect(page.locator('.profile-identity')).toContainText('Alice');
    await expect(page.locator('.profile-votes')).toHaveCount(0);
    const results = await new AxeBuilder({page}).analyze();
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
test('cast, replacement, withdrawal and identity change refresh the personal route', async ({page}) => {
    let identity = 'Alice';
    let selected: number | null = null;
    let votedAt = '2026-09-15T12:00:00.000Z';
    const options = [{number: 1, text: 'Bike'}, {number: 2, text: 'Train'}];
    const poll = {id: 'p_v1_one', title: 'Personal transport', state: 'active', visibility: 'public',
        createdAt: votedAt, endsAt: '2099-01-01T00:00:00Z', totalVotes: 1,
        options, templateSnapshotOptions: options, templateGroup: {id: 'g_v1_one', name: 'Transport', description: ''}};
    await page.route('**/api/v1/**', route => {
        const request = route.request();
        const url = request.url();
        if (url.endsWith('/csrf')) return route.fulfill({json: {token: 'test', headerName: 'X-XSRF-TOKEN'}});
        if (url.endsWith('/identity') && request.method() === 'POST') {
            identity = request.postDataJSON().userID;
            selected = null;
            return route.fulfill({status: 204});
        }
        if (url.endsWith('/identity')) return route.fulfill({json: {userID: identity}});
        if (url.endsWith('/identity/votes')) {
            const votes = [];
            if (selected !== null) votes.push({poll: {id: poll.id, title: poll.title, state: 'active'}, option: options.find(o => o.number === selected), votedAt});
            return route.fulfill({json: {userID: identity, votes}});
        }
        if (url.endsWith('/polls/p_v1_one/votes')) {
            if (request.method() === 'DELETE') { selected = null; return route.fulfill({status: 204}); }
            let status = 'replaced';
            if (selected === null) status = 'created';
            selected = request.postDataJSON().optionNumber;
            votedAt = '2026-09-16T12:00:00.000Z';
            if (selected === 1) votedAt = '2026-09-15T12:00:00.000Z';
            return route.fulfill({json: {status, optionNumber: selected}});
        }
        if (url.endsWith('/polls/p_v1_one/results')) {
            if (selected === null) return route.fulfill({status: 403, json: {code: 'results-not-available'}});
            return route.fulfill({json: {...poll, options: options.map(o => {
                const votes = [];
                if (o.number === selected) votes.push({userID: identity, votedAt});
                return {...o, voteCount: votes.length, votes};
            })}});
        }
        if (url.endsWith('/polls/p_v1_one')) return route.fulfill({json: poll});
        return route.fulfill({json: []});
    });
    await page.goto('/poll/p_v1_one');
    await page.getByRole('radio', {name: 'Bike'}).click();
    await expect(page.getByText('Stimme abgegeben.')).toBeVisible();
    await page.locator('.sidebar-navigation').getByRole('link', {name: 'Persönliches Profil'}).click();
    await expect(page.locator('.profile-vote')).toContainText('Bike');
    await page.goBack();
    await page.getByRole('radio', {name: 'Train'}).click();
    await expect(page.getByText('Stimme geändert.')).toBeVisible();
    await page.locator('.sidebar-navigation').getByRole('link', {name: 'Persönliches Profil'}).click();
    await expect(page.locator('.profile-vote')).toContainText('Train');
    await expect(page.locator('.profile-vote time')).toHaveAttribute('datetime', '2026-09-16T12:00:00.000Z');
    await page.goBack();
    await page.getByRole('link', {name: 'Abstimmung - Ergebnisse'}).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', {name: 'Stimme zurücknehmen', exact: true}).click();
    await expect(page.getByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
    await page.locator('.sidebar-navigation').getByRole('link', {name: 'Persönliches Profil'}).click();
    await expect(page.getByText('Keine aktuelle Stimme')).toBeVisible();
    await page.locator('.identity-shell-editor').getByRole('button', {name: 'Identität bearbeiten'}).click();
    await page.getByLabel('Neue Identität').fill('Bob');
    await page.locator('.identity-shell-editor').getByRole('button', {name: 'Speichern'}).click();
    await page.getByRole('button', {name: 'Änderung bestätigen'}).click();
    await expect(page.locator('.profile-identity')).toContainText('Bob');
    await expect(page.locator('.profile-page')).not.toContainText('Alice');
});

test('public personal profile uses one aggregate request and is accessible at 320px', async ({page}) => {
    const requests: string[] = [];
    await page.setViewportSize({width: 320, height: 720});
    await page.route('**/api/v1/**', route => {
        const url = route.request().url();
        requests.push(url);
        if (url.endsWith('/identity/votes')) return route.fulfill({json: {userID: 'Alice', votes: [vote]}});
        if (url.endsWith('/identity')) return route.fulfill({json: {userID: 'Alice'}});
        return route.fulfill({status: 500});
    });
    await page.goto('/profile');
    await expect(page.getByRole('heading', {name: 'Persönliches Profil', level: 1})).toBeVisible();
    await expect(page.locator('.profile-page')).toContainText('Personal transport');
    await expect(page.locator('.profile-page')).toContainText('Train');
    await expect(page.locator('.profile-page')).toContainText('archiviert');
    await expect(page.locator('.profile-page')).not.toContainText('p_v1_one');
    await expect(page.locator('.profile-page')).not.toContainText('Bob');
    expect(requests.filter(url => url.endsWith('/identity/votes'))).toHaveLength(1);
    expect(requests.some(url => url.includes('/polls'))).toBe(false);
    expect(requests.some(url => url.includes('/admin'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const results = await new AxeBuilder({page}).analyze();
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
