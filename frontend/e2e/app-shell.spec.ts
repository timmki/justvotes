import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads the app shell on a deep client route', async ({ page }) => {
  await page.goto('/poll/example');

  await expect(page.getByRole('heading', { name: 'Poll', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /^Polls/ }).click();
  await expect(page).toHaveURL(/\/polls$/);
});

test('persists language and theme choices', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'English anzeigen' }).click();
  await page.getByRole('button', { name: 'Enable dark mode' }).click();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('has no critical shell accessibility violations', async ({ page }) => {
  for (const route of ['/', '/polls', '/admin']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(({ impact }) => impact === 'critical')).toEqual([]);
  }
});

test('changes the identity once after confirming the warning', async ({ page }) => {
  let identity: string | null = null;
  const requests: { method: string; url: string }[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url() });
    if (request.url().endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    if (request.url().endsWith('/identity') && request.method() === 'GET') return route.fulfill({ json: { userID: identity } });
    if (request.url().endsWith('/identity') && request.method() === 'POST') {
      identity = request.postDataJSON().userID;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Identität bearbeiten' }).click();
  await page.getByLabel('Neue Identität').fill('Alice_1');
  await page.getByRole('button', { name: 'Speichern' }).click();

  await expect(page.getByRole('dialog')).toContainText('Stimmen der bisherigen Identität');
  await page.getByRole('button', { name: 'Änderung bestätigen' }).click();
  await expect(page.getByTitle('alice_1')).toBeVisible();

  expect(requests.filter(({ method, url }) => method === 'POST' && url.endsWith('/identity'))).toHaveLength(1);
  expect(requests.filter(({ method, url }) => method === 'DELETE' && url.includes('/votes'))).toHaveLength(0);
});

test('renders public poll cards from one list request without N+1 detail requests', async ({ page }) => {
  const requests: string[] = [];
  await page.setViewportSize({ width: 375, height: 800 });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    requests.push(request.url());
    if (request.url().endsWith('/polls') && request.method() === 'GET') {
      return route.fulfill({ json: [{
        id: 'opaque-poll-id-123456789',
        title: 'A long poll title that remains usable on a narrow viewport',
        visibility: 'public',
        state: 'active',
        createdAt: '2025-01-05T14:30:00.000Z',
        endsAt: null,
        totalVotes: 0,
        templateGroup: { id: 'group-1', name: 'Group', description: 'Description' },
        templateSnapshotOptions: [],
        options: [],
      }] });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto('/polls');

  const card = page.getByRole('link', { name: /A long poll title/ });
  await expect(card).toContainText('0');
  await expect(card).toContainText('opaque-poll-id-123456789');
  await expect(card).toContainText('Admin');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(requests.filter((url) => url.endsWith('/polls'))).toHaveLength(1);
  expect(requests.some((url) => /\/polls\/[^/]+$/.test(url))).toBe(false);
});

test('logs in, restores the active admin area after reload, and logs out', async ({ page }) => {
  let authenticated = false;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    if (url.endsWith('/admin/session')) return authenticated ? route.fulfill({ status: 204 }) : route.fulfill({ status: 401, json: { status: 401, code: 'unauthorized' } });
    if (url.endsWith('/admin/login')) { authenticated = true; return route.fulfill({ status: 204 }); }
    if (url.endsWith('/admin/logout')) { authenticated = false; return route.fulfill({ status: 204 }); }
    if (url.includes('/admin/votes?')) return route.fulfill({ json: { votes: [], page: 0, size: 50, totalElements: 0 } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/admin');
  await expect(page.getByLabel('Benutzername')).toBeVisible();
  expect(await page.getByRole('navigation', { name: 'Admin-Navigation' }).count()).toBe(0);
  await page.getByLabel('Benutzername').fill('admin');
  await page.getByLabel('Passwort').fill('secret');
  await page.getByRole('button', { name: 'Anmelden' }).click();

  await expect(page.getByRole('heading', { name: 'Stimmen', level: 3 })).toBeVisible();
  await expect(page.locator('.admin-tabs').getByRole('link', { name: 'Stimmen' })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Stimmen', level: 3 })).toBeVisible();
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByLabel('Benutzername')).toBeVisible();
  expect(await page.getByRole('navigation', { name: 'Admin-Navigation' }).count()).toBe(0);
});

test('shows login on session expiry and restores the previous admin route', async ({ page }) => {
  let authenticated = true;
  let expired = false;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    if (url.endsWith('/admin/session')) return authenticated ? route.fulfill({ status: 204 }) : route.fulfill({ status: 401, json: { status: 401, code: 'unauthorized' } });
    if (url.endsWith('/admin/login')) { authenticated = true; expired = false; return route.fulfill({ status: 204 }); }
    if (url.endsWith('/admin/polls')) return expired ? route.fulfill({ status: 401, json: { status: 401, code: 'unauthorized' } }) : route.fulfill({ json: [] });
    return route.fulfill({ json: [] });
  });

  await page.goto('/admin/polls');
  await expect(page.getByRole('heading', { name: 'Polls', level: 3 })).toBeVisible();
  expired = true;
  await page.reload();

  await expect(page.getByLabel('Benutzername')).toBeVisible();
  expect(await page.getByRole('navigation', { name: 'Admin-Navigation' }).count()).toBe(0);
  await page.getByLabel('Benutzername').fill('admin');
  await page.getByLabel('Passwort').fill('secret');
  await page.getByRole('button', { name: 'Anmelden' }).click();

  await expect(page.getByRole('heading', { name: 'Polls', level: 3 })).toBeVisible();
  await expect(page.locator('.admin-tabs').getByRole('link', { name: 'Polls' })).toHaveAttribute('aria-current', 'page');
});
