import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

const session = {email: 'alice@example.test', role: 'user', identity: 'Anna', passwordChangeRequired: false};

test('a poll from the members group shows a new member after reload', async ({page}) => {
    let options = [{number: 1, text: 'Anna'}, {number: 2, text: 'Bert'}];
    const poll = () => ({id: 'p_v1_members', title: 'Dienstplan', state: 'active', visibility: 'public',
        createdAt: '2026-09-15T12:00:00.000Z', endsAt: '2099-01-01T00:00:00Z', totalVotes: 1,
        options, templateSnapshotOptions: options,
        templateGroup: {id: 'g_v1_members', name: 'Alle Mitglieder', description: '', kind: 'members'}});
    await page.route('**/api/v1/**', route => {
        const url = new URL(route.request().url()).pathname;
        if (url === '/api/v1/session') return route.fulfill({json: session});
        if (url.endsWith('/csrf')) return route.fulfill({json: {token: 'test', headerName: 'X-XSRF-TOKEN'}});
        if (url.endsWith('/identity/votes')) return route.fulfill({json: {userID: 'Anna', votes: []}});
        if (url.endsWith('/polls/p_v1_members/results')) return route.fulfill({status: 403, json: {code: 'results-not-available'}});
        if (url.endsWith('/polls/p_v1_members')) return route.fulfill({json: poll()});
        return route.fulfill({json: []});
    });

    await page.goto('/poll/p_v1_members');
    await expect(page.getByRole('radio', {name: 'Bert'})).toBeVisible();
    await expect(page.getByRole('radio', {name: 'Clara'})).toHaveCount(0);

    options = [...options, {number: 3, text: 'Clara'}];
    await page.reload();

    await expect(page.getByRole('radio', {name: 'Clara'})).toBeVisible();
    const results = await new AxeBuilder({page}).analyze();
    expect(results.violations).toEqual([]);
});
