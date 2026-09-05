import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const centralRoutes = ['/', '/polls', '/poll/example', '/poll/results/example', '/poll/results/example/option/1', '/poll/audit/example', '/404', '/admin', '/admin/votes', '/admin/polls', '/admin/groups', '/admin/templates', '/admin/create'];

test('loads the app shell on a deep client route', async ({ page }) => {
  await page.goto('/poll/example');

  await expect(page.getByRole('heading', { name: 'Poll', level: 1 })).toBeVisible();
  await page.locator('.back-link').click();
  await expect(page).toHaveURL(/\/polls$/);
});

test('persists language and theme choices', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'English anzeigen' }).click();
  await page.getByRole('button', { name: 'Choose theme' }).click();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('keeps the public navigation reachable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/polls');

  const navigation = page.locator('.mobile-navigation');
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Startseite' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Polls' })).toHaveAttribute('aria-current', 'page');
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  const themeButton = page.getByRole('button', { name: 'Theme auswählen' });
  await themeButton.click();
  await expect(page.getByRole('radiogroup', { name: 'Theme auswählen' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radiogroup', { name: 'Theme auswählen' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(await page.locator('.mobile-navigation .nav-item').first().evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});

test('keeps central routes within supported viewport widths', async ({ page }) => {
  for (const width of [320, 600, 900, 1280]) {
    await page.setViewportSize({width, height: 720});
    for (const route of centralRoutes) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});

test('keeps populated public and admin surfaces within supported viewport widths', async ({ page }) => {
  const poll = {
    id: 'p_responsive',
    title: 'Responsive browser poll',
    visibility: 'public',
    state: 'active',
    createdAt: '2026-08-31T12:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    totalVotes: 1,
    templateGroup: { id: 'g_responsive', name: 'Responsive group', description: '' },
    templateSnapshotOptions: [{ number: 1, text: 'Yes' }, { number: 2, text: 'No' }],
    options: [{ number: 1, text: 'Yes' }, { number: 2, text: 'No' }],
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/admin/session')) return route.fulfill({ status: 204 });
    if (url.endsWith('/polls/p_responsive/results')) return route.fulfill({ json: {
      ...poll,
      options: [{ number: 1, text: 'Yes', voteCount: 1, votes: [{ userID: 'alice', votedAt: poll.createdAt }] }, { number: 2, text: 'No', voteCount: 0, votes: [] }],
    } });
    if (url.endsWith('/polls/p_responsive/audit')) return route.fulfill({ json: [
      { event: 'VoteCast', actor: 'alice', occurredAt: poll.createdAt, selection: 'Yes', userID: 'alice', optionNumber: 1, votedAt: poll.createdAt },
    ] });
    if (url.endsWith('/polls/p_responsive')) return route.fulfill({ json: poll });
    if (url.endsWith('/admin/polls')) return route.fulfill({ json: [poll] });
    if (url.endsWith('/polls')) return route.fulfill({ json: [poll] });
    return route.fulfill({ json: [] });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Theme auswählen' }).click();
  await page.getByRole('radio', { name: 'Hell' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  for (const width of [320, 600, 900, 1280]) {
    await page.setViewportSize({width, height: 720});
    for (const route of ['/', '/polls', '/poll/p_responsive', '/poll/results/p_responsive', '/poll/results/p_responsive/option/1', '/poll/audit/p_responsive', '/admin/polls']) {
      await page.goto(route);
      const content = route.includes('/audit')
        ? page.getByRole('heading', { name: 'Stimme abgegeben', level: 3 })
        : page.getByText('Responsive browser poll').first();
      await expect(content).toBeVisible();
      if (route === '/') {
        const featured = page.getByRole('region', { name: 'Im Fokus' });
        await expect(featured).toBeVisible();
        await expect(featured).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});

test('has no critical or serious shell accessibility violations', async ({ page }) => {
  for (const route of centralRoutes) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
  }
});

test('uses only same-origin runtime resources', async ({ page }) => {
  await page.goto('/');

  const externalResources = await page.evaluate(() => performance.getEntriesByType('resource')
    .map(({ name }) => new URL(name, location.href).origin)
    .filter((origin) => origin !== location.origin));

  expect(externalResources).toEqual([]);
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
  await page.locator('.identity-card').getByRole('button', { name: 'Identität bearbeiten' }).click();
  await page.getByLabel('Neue Identität').fill('Alice_1');
  await page.getByRole('button', { name: 'Speichern' }).click();

  await expect(page.getByRole('dialog')).toContainText('Stimmen der bisherigen Identität');
  await page.getByRole('button', { name: 'Änderung bestätigen' }).click();
  await expect(page.getByTitle('alice_1')).toHaveCount(2);

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
  await expect(card).not.toContainText('opaque-poll-id-123456789');
  await expect(card).toContainText('Admin');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(requests.filter((url) => url.endsWith('/polls'))).toHaveLength(1);
  expect(requests.some((url) => /\/polls\/[^/]+$/.test(url))).toBe(false);
});

test('casts, replaces, repeats and restores a public poll vote', async ({ page }) => {
  let selectedOption: number | null = null;
  const voteRequests: number[] = [];
  const requestMethods: string[] = [];
  const poll = () => ({
    id: 'p_v1_vote',
    title: 'Browser vote poll',
    visibility: 'public',
    state: 'active',
    createdAt: '2026-08-31T12:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    totalVotes: selectedOption === null ? 0 : 1,
    templateGroup: { id: 'g_v1_vote', name: 'Vote group', description: '' },
    templateSnapshotOptions: [{ number: 2, text: 'Zebra' }, { number: 7, text: 'Apfel' }],
    options: [{ number: 2, text: 'Zebra' }, { number: 7, text: 'Apfel' }],
  });
  const results = () => ({
    id: 'p_v1_vote',
    title: 'Browser vote poll',
    visibility: 'public',
    state: 'active',
    createdAt: '2026-08-31T12:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    totalVotes: selectedOption === null ? 0 : 1,
    options: [{ number: 2, text: 'Zebra' }, { number: 7, text: 'Apfel' }].map((option) => ({
      ...option,
      voteCount: selectedOption === option.number ? 1 : 0,
      votes: selectedOption === option.number ? [{ userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z' }] : [],
    })),
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    requestMethods.push(request.method());
    if (url.endsWith('/identity') && request.method() === 'GET') return route.fulfill({ json: { userID: 'alice' } });
    if (url.endsWith('/polls/p_v1_vote') && request.method() === 'GET') return route.fulfill({ json: poll() });
    if (url.endsWith('/polls/p_v1_vote/results') && request.method() === 'GET') {
      return selectedOption === null
        ? route.fulfill({ status: 403, json: { status: 403, code: 'results-not-available' } })
        : route.fulfill({ json: results() });
    }
    if (url.endsWith('/polls/p_v1_vote/votes') && request.method() === 'POST') {
      const optionNumber = request.postDataJSON().optionNumber;
      voteRequests.push(optionNumber);
      const status = selectedOption === null ? 'created' : selectedOption === optionNumber ? 'unchanged' : 'replaced';
      selectedOption = optionNumber;
      return route.fulfill({ json: { status, optionNumber } });
    }
    if (url.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    return route.fulfill({ json: [] });
  });

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/poll/p_v1_vote');
  await expect(page.getByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Poll-Metadaten' })).toContainText('Teilnahme');
  await expect(page.getByRole('radio', { name: 'Apfel' })).toBeVisible();
  await page.getByRole('radio', { name: 'Apfel' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('Stimme abgegeben.')).toBeVisible();
  await page.getByRole('radio', { name: 'Zebra' }).click();
  await expect(page.getByText('Stimme geändert.')).toBeVisible();
  await page.getByRole('radio', { name: 'Zebra' }).click();
  await expect(page.getByText('Stimme unverändert.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Poll-Ergebnisse' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Zebra' })).toBeChecked();
  await expect(page.getByText('Eigene Stimme')).toBeVisible();
  expect(voteRequests).toEqual([7, 2, 2]);
  expect(requestMethods).not.toContain('DELETE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('disables voting for an expired poll and safely handles private or missing polls', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/identity')) return route.fulfill({ json: { userID: null } });
    if (url.endsWith('/polls/p_expired')) return route.fulfill({ json: {
      id: 'p_expired',
      title: 'Expired browser poll',
      visibility: 'public',
      state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z',
      endsAt: '2026-08-31T13:00:00.000Z',
      totalVotes: 1,
      templateGroup: { id: 'g_expired', name: 'Expired group', description: '' },
      templateSnapshotOptions: [{ number: 1, text: 'Yes' }],
      options: [{ number: 1, text: 'Yes' }],
    } });
    if (url.endsWith('/polls/p_expired/results')) return route.fulfill({ json: {
      id: 'p_expired',
      title: 'Expired browser poll',
      visibility: 'public',
      state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z',
      endsAt: '2026-08-31T13:00:00.000Z',
      totalVotes: 1,
      options: [{ number: 1, text: 'Yes', voteCount: 1, votes: [] }],
    } });
    if (url.endsWith('/polls/p_private')) return route.fulfill({ json: {
      id: 'p_private',
      title: 'Private browser poll',
      visibility: 'private',
      state: 'draft',
      createdAt: '2026-08-31T12:00:00.000Z',
      endsAt: null,
      totalVotes: 0,
      templateGroup: { id: 'g_private', name: 'Private group', description: '' },
      templateSnapshotOptions: [{ number: 1, text: 'Yes' }],
      options: [{ number: 1, text: 'Yes' }],
    } });
    if (url.endsWith('/polls/p_missing')) return route.fulfill({ status: 404, json: { status: 404, code: 'not_found' } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/p_expired');
  await expect(page.getByRole('heading', { name: 'Expired browser poll', level: 3 })).toBeVisible();
  await expect(page.getByText(/Dieser Poll ist nicht mehr aktiv.*abgelaufen/)).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Yes' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Poll-Ergebnisse' })).toBeVisible();

  await page.goto('/poll/p_private');
  await expect(page.getByRole('heading', { name: 'Seite nicht gefunden', level: 3 })).toBeVisible();
  await page.goto('/poll/p_missing');
  await expect(page.getByRole('heading', { name: 'Seite nicht gefunden', level: 3 })).toBeVisible();
});

test('schützt Poll-Ergebnisse vor Stimmabgabe und gibt sie nach Stimmabgabe oder Ablauf frei', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/identity')) return route.fulfill({ json: { userID: 'alice' } });
    if (url.endsWith('/polls/p_results_before/results')) {
      return route.fulfill({ status: 403, json: { status: 403, code: 'results-not-available' } });
    }
    if (url.endsWith('/polls/p_results_after/results')) return route.fulfill({ json: {
      id: 'p_results_after', title: 'Released results poll', visibility: 'public', state: 'active',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: 1,
      options: [{ number: 1, text: 'Yes', voteCount: 1, votes: [{ userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z' }] }],
    } });
    if (url.endsWith('/polls/p_results_expired/results')) return route.fulfill({ json: {
      id: 'p_results_expired', title: 'Expired results poll', visibility: 'public', state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2026-08-31T13:00:00.000Z', totalVotes: 0,
      options: [{ number: 1, text: 'Yes', voteCount: 0, votes: [] }],
    } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/results/p_results_before');
  await expect(page.getByRole('heading', { name: 'Diese Aktion ist nicht erlaubt.', level: 3 })).toBeVisible();

  await page.goto('/poll/results/p_results_after');
  await expect(page.getByRole('heading', { name: 'Released results poll', level: 3 })).toBeVisible();
  await expect(page.getByText('Eigene Stimme')).toBeVisible();

  await page.goto('/poll/results/p_results_expired');
  await expect(page.getByRole('heading', { name: 'Expired results poll', level: 3 })).toBeVisible();
  await expect(page.getByText('Abgelaufen')).toBeVisible();
});

test('rolls back the selected option after a failed vote mutation', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/identity')) return route.fulfill({ json: { userID: 'alice' } });
    if (url.endsWith('/polls/p_failed_vote') && request.method() === 'GET') return route.fulfill({ json: {
      id: 'p_failed_vote', title: 'Failed vote poll', visibility: 'public', state: 'active',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: 1,
      templateGroup: { id: 'g_failed_vote', name: 'Vote group', description: '' },
      templateSnapshotOptions: [{ number: 2, text: 'Zebra' }, { number: 7, text: 'Apfel' }],
      options: [{ number: 2, text: 'Zebra' }, { number: 7, text: 'Apfel' }],
    } });
    if (url.endsWith('/polls/p_failed_vote/results')) return route.fulfill({ json: {
      id: 'p_failed_vote', title: 'Failed vote poll', visibility: 'public', state: 'active',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: 1,
      options: [{ number: 2, text: 'Zebra', voteCount: 1, votes: [{ userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z' }] }, { number: 7, text: 'Apfel', voteCount: 0, votes: [] }],
    } });
    if (url.endsWith('/polls/p_failed_vote/votes') && request.method() === 'POST') return route.fulfill({ status: 500, json: { status: 500, code: 'server_error' } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/p_failed_vote');
  await expect(page.getByRole('radio', { name: 'Zebra' })).toBeChecked();
  await page.getByRole('radio', { name: 'Apfel' }).click();

  await expect(page.getByRole('alert')).toHaveText('Die Anfrage konnte nicht verarbeitet werden.');
  await expect(page.getByRole('radio', { name: 'Zebra' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Apfel' })).not.toBeChecked();
});

test('refreshes active results on schedule and stops after the poll expires', async ({ page }) => {
  let resultsRequest = 0;
  await page.clock.install();
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/identity')) return route.fulfill({ json: { userID: 'alice' } });
    if (url.endsWith('/polls/p_live_results/results')) {
      resultsRequest += 1;
      const active = resultsRequest < 3;
      return route.fulfill({ json: {
        id: 'p_live_results', title: 'Live results poll', visibility: 'public', state: active ? 'active' : 'expired',
        createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: resultsRequest,
        options: [{ number: 1, text: 'Yes', voteCount: resultsRequest, votes: [{ userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z' }] }],
      } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/results/p_live_results');
  await expect(page.getByRole('heading', { name: 'Live results poll', level: 3 })).toBeVisible();
  expect(resultsRequest).toBe(1);
  await page.clock.fastForward(5_000);
  await expect(page.getByText('2 Stimmen')).toBeVisible();
  expect(resultsRequest).toBe(2);
  await page.clock.fastForward(5_000);
  await expect(page.getByText('3 Stimmen')).toBeVisible();
  expect(resultsRequest).toBe(3);
  await page.clock.fastForward(10_000);
  expect(resultsRequest).toBe(3);
});

test('loads a direct option link with the complete current voter list', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/polls/p_option_details/results')) return route.fulfill({ json: {
      id: 'p_option_details', title: 'Option details poll', visibility: 'public', state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2026-08-31T13:00:00.000Z', totalVotes: 2,
       options: [{ number: 7, text: 'Apfel', voteCount: 2, votes: [
         { userID: 'very-long.identity-0123456789', votedAt: '2026-08-31T12:01:00.000Z' },
         { userID: 'bob', votedAt: '2026-08-31T12:02:00.000Z' },
      ] }],
    } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/results/p_option_details/option/7');
  await expect(page.getByRole('heading', { name: 'Apfel', level: 3 })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Option-Kontext' })).toContainText('Optionsnummer');
  await expect(page.locator('.option-summary dd')).toHaveText(['7', '2']);
  await expect(page.getByText('very-long.identity-0123456789')).toBeVisible();
  await expect(page.getByText('bob')).toBeVisible();
  await expect(page.locator('.voter-list li')).toHaveText([
    /1.*very-long\.identity-0123456789.*31\.08\.2026/, /2.*bob.*31\.08\.2026/,
  ]);
  await expect(page.locator('time').first()).toContainText('31.08.2026');
  await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-08-31T12:01:00.000Z');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByRole('link', { name: 'Poll-Ergebnisse' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/poll\/results\/p_option_details$/);
  await page.goto('/poll/results/p_option_details/option/7');
  await page.getByRole('link', { name: 'Audit Log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit Log', level: 1 })).toBeVisible();
});

test('zeigt eine lokalisierte, zugaengliche oeffentliche Domaenenereignis-Timeline', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    if (request.url().endsWith('/polls/p_audit_browser/audit')) return route.fulfill({ json: [
      { event: 'PollPublished', actor: 'admin', occurredAt: '2026-08-31T12:00:00.000Z' },
      { event: 'VoteCast', actor: 'identity-with-a-very-long-name-that-must-break', occurredAt: '2026-08-31T12:01:00.000Z', selection: 'An equally long poll option text that remains readable', userID: 'alice', optionNumber: 1, votedAt: '2026-08-31T12:01:00.000Z' },
    ] });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/audit/p_audit_browser');
  await expect(page.getByRole('complementary', { name: 'Audit-Kontext' })).toContainText('2');
  const timeline = page.getByRole('list', { name: 'Domänenereignis-Timeline' });
  await expect(timeline.getByRole('heading', { name: 'Stimme abgegeben', level: 3 })).toBeVisible();
  await expect(timeline.getByRole('heading', { name: 'Poll veröffentlicht', level: 3 })).toBeVisible();
  await expect(timeline.getByRole('heading', { level: 3 })).toHaveText(['Stimme abgegeben', 'Poll veröffentlicht']);
  await expect(timeline.locator('.audit-entry')).toHaveCount(2);
  await expect(timeline).toContainText('identity-with-a-very-long-name-that-must-break');
  await expect(timeline).toContainText('alice');
  await expect(timeline).toContainText('Stimmzeitpunkt');
  await expect(timeline).toContainText('An equally long poll option text that remains readable');
  await expect(timeline.locator('time').first()).toHaveAttribute('datetime', '2026-08-31T12:01:00.000Z');
  await expect(page.locator('#main-content').getByRole('link', { name: 'Polls' })).toHaveAttribute('href', '/poll/p_audit_browser');
  await expect(page.getByRole('link', { name: 'Poll-Ergebnisse' })).toHaveAttribute('href', '/poll/results/p_audit_browser');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'critical')).toEqual([]);
});

test('zeigt null Prozent und Gleichstände in Poll-Ergebnissen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/polls/p_zero_results/results')) return route.fulfill({ json: {
      id: 'p_zero_results', title: 'Zero results poll', visibility: 'public', state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2026-08-31T13:00:00.000Z', totalVotes: 0,
      options: [{ number: 1, text: 'No', voteCount: 0, votes: [] }, { number: 2, text: 'Yes', voteCount: 0, votes: [] }],
    } });
    if (url.endsWith('/polls/p_tie_results/results')) return route.fulfill({ json: {
      id: 'p_tie_results', title: 'Tie results poll', visibility: 'public', state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2026-08-31T13:00:00.000Z', totalVotes: 2,
      options: [
        { number: 1, text: 'Zulu', voteCount: 1, votes: [] },
        { number: 2, text: 'Alpha', voteCount: 1, votes: [] },
        { number: 3, text: 'Zebra', voteCount: 0, votes: [] },
        { number: 4, text: 'Beta', voteCount: 0, votes: [] },
      ],
    } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/results/p_zero_results');
  await expect(page.locator('.result-option-meta span:first-child')).toHaveText(['0 %', '0 %']);
  await expect(page.locator('.result-summary dd')).toHaveText(['0', '0 %']);
  await expect(page.getByRole('complementary', { name: 'Aktueller Spitzenstand' })).toContainText('Noch kein Spitzenstand');
  await expect(page.locator('.result-option-meta')).toHaveText(['0 %0 Stimmen', '0 %0 Stimmen']);
  await page.goto('/poll/results/p_tie_results');
  await expect(page.locator('.result-option strong')).toHaveText(['Gleichstand', 'Gleichstand']);
  await expect(page.getByRole('complementary', { name: 'Aktueller Spitzenstand' })).toContainText('Alpha, Zulu');
  await expect(page.locator('.result-option-heading a')).toHaveText(['Alpha', 'Zulu', 'Beta', 'Zebra']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('confirms vote withdrawal and returns to the poll detail', async ({ page }) => {
  let withdrawn = false;
  let deleteRequests = 0;
  let csrfHeader: string | undefined;
  let confirmationMessage = '';
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/identity')) return route.fulfill({ json: { userID: 'alice' } });
    if (url.endsWith('/polls/p_withdrawal') && request.method() === 'GET') return route.fulfill({ json: {
      id: 'p_withdrawal', title: 'Withdrawal poll', visibility: 'public', state: 'active',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: withdrawn ? 0 : 1,
      templateGroup: { id: 'g_withdrawal', name: 'Vote group', description: '' },
      templateSnapshotOptions: [{ number: 7, text: 'Apfel' }], options: [{ number: 7, text: 'Apfel' }],
    } });
    if (url.endsWith('/polls/p_withdrawal/results')) return withdrawn
      ? route.fulfill({ status: 403, json: { status: 403, code: 'results-not-available' } })
      : route.fulfill({ json: {
        id: 'p_withdrawal', title: 'Withdrawal poll', visibility: 'public', state: 'active',
        createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', totalVotes: 1,
        options: [{ number: 7, text: 'Apfel', voteCount: 1, votes: [{ userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z' }] }],
      } });
    if (url.endsWith('/polls/p_withdrawal/votes') && request.method() === 'DELETE') {
      deleteRequests += 1;
      csrfHeader = request.headers()['x-xsrf-token'];
      withdrawn = true;
      return route.fulfill({ status: 204 });
    }
    if (url.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    return route.fulfill({ json: [] });
  });
  await page.goto('/poll/results/p_withdrawal');
  page.once('dialog', async (dialog) => {
    confirmationMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Stimme zurücknehmen' }).click();
  expect(confirmationMessage).toBe('Eigene Stimme wirklich zurücknehmen?');
  expect(deleteRequests).toBe(0);

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByRole('button', { name: 'Stimme zurücknehmen' }).click();
  await expect(page.getByRole('heading', { name: 'Withdrawal poll', level: 3 })).toBeVisible();
  await expect(page.getByText('Ergebnisse werden nach eigener Stimme freigegeben.')).toBeVisible();
  expect(deleteRequests).toBe(1);
  expect(csrfHeader).toBe('csrf-token');
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
  await expect(page.locator('.back-link')).toHaveAttribute('href', '/');
  await page.goto('/admin/polls');
  await expect(page.locator('.back-link')).toHaveAttribute('href', '/');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Stimmen', level: 3 })).toBeVisible();
  await expect(page.locator('.sidebar-navigation').getByRole('link', { name: 'Polls' })).toBeVisible();
  await expect(page.locator('.sidebar-navigation').getByRole('link')).toHaveCount(5);
  await expect(page.locator('.sidebar-navigation').getByRole('link', { name: 'Stimmen' })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Stimmen', level: 3 })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 720 });
  const mobileNavigation = page.locator('.mobile-navigation');
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole('link')).toHaveCount(5);
  await expect(mobileNavigation.getByRole('link', { name: 'Stimmen' })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  for (const [label, path] of [['Stimmen', '/admin/votes'], ['Polls', '/admin/polls'], ['Vorlagengruppen', '/admin/groups'], ['Optionsvorlagen', '/admin/templates'], ['Poll erstellen', '/admin/create']] as const) {
    const link = mobileNavigation.getByRole('link', { name: label });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByLabel('Benutzername')).toBeVisible();
  expect(await page.getByRole('navigation', { name: 'Admin-Navigation' }).count()).toBe(0);
});

test('removes an administrative vote through the browser flow', async ({ page }) => {
  let votePresent = true;
  let removalReason: string | undefined;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    if (url.endsWith('/admin/session')) return route.fulfill({ status: 204 });
    if (url.includes('/admin/votes/') && request.method() === 'DELETE') {
      removalReason = request.postDataJSON().reason;
      votePresent = false;
      return route.fulfill({ status: 204 });
    }
    if (url.includes('/admin/votes?')) return route.fulfill({ json: votePresent ? {
      votes: [{ voteId: 'v_v1_browser', userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z', poll: { id: 'p_v1_browser', title: 'Browser poll' }, option: { number: 1, text: 'Yes' } }],
      page: 0,
      size: 50,
      totalElements: 1,
    } : { votes: [], page: 0, size: 50, totalElements: 0 } });
    if (url.endsWith('/polls/p_v1_browser/results')) return route.fulfill({ json: {
      id: 'p_v1_browser',
      title: 'Browser poll',
      visibility: 'public',
      state: 'active',
      createdAt: '2026-08-31T12:00:00.000Z',
      endsAt: null,
      totalVotes: votePresent ? 1 : 0,
      options: [{ number: 1, text: 'Yes', voteCount: votePresent ? 1 : 0, votes: votePresent ? [{ userID: 'alice', votedAt: '2026-08-31T12:00:00.000Z' }] : [] }],
    } });
    if (url.endsWith('/polls/p_v1_browser/audit')) return route.fulfill({ json: votePresent ? [] : [{ event: 'VoteRemovedByAdmin', actor: 'admin', occurredAt: '2026-08-31T12:00:00.000Z', selection: 'Yes', reason: 'Browser test', userID: 'alice', optionNumber: 1, votedAt: '2026-08-31T12:00:00.000Z' }] });
    return route.fulfill({ json: [] });
  });

  await page.goto('/admin/votes');
  const adminVote = page.locator('.admin-vote-list').getByText('Browser poll').locator('..');
  await expect(adminVote).toBeVisible();
  await expect(adminVote).not.toContainText('p_v1_browser');
  await expect(page.getByText('Aktuelle Stimmen').locator('..')).toContainText('1');
  await page.getByRole('button', { name: 'Stimme entfernen' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Stimme entfernen' })).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Begründung' }).fill('  Browser test  ');
  await dialog.getByRole('button', { name: 'Stimme entfernen' }).click();

  await expect(page.getByText('Noch keine Daten vorhanden')).toBeVisible();
  expect(removalReason).toBe('Browser test');

  await page.goto('/poll/results/p_v1_browser');
  await expect(page.getByRole('heading', { name: 'Browser poll', level: 3 })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('p_v1_browser');
  await expect(page.getByRole('heading', { name: 'Browser poll', level: 3 })).not.toHaveAccessibleName(/p_v1_browser/);
  await expect(page.locator('.result-summary dd')).toHaveText(['0', '0 %']);
  await page.goto('/poll/results/p_v1_browser/option/1');
  await expect(page.getByText('Noch keine Daten vorhanden')).toBeVisible();
  await expect(page.getByText('alice')).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText('p_v1_browser');
  await page.goto('/poll/audit/p_v1_browser');
  await expect(page.getByRole('heading', { name: 'Stimme administrativ entfernt', level: 3 })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('p_v1_browser');
  await expect(page.getByRole('heading', { name: 'Stimme administrativ entfernt', level: 3 })).not.toHaveAccessibleName(/p_v1_browser/);
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
  await expect(page.locator('.sidebar-navigation').getByRole('link', { name: 'Polls' })).toHaveAttribute('aria-current', 'page');
});

test('runs an admin poll through publication, expiry, archive, restore and destructive deletion', async ({ page }) => {
  let state: 'draft' | 'active' | 'expired' | 'archived' | 'deleted' = 'draft';
  let permanentlyDeleted = false;
  const lifecycleTitle = 'A deliberately long poll title that remains readable inside the responsive administration card';
  const poll = (currentState = state) => ({
    id: 'p_v1_lifecycle',
    title: lifecycleTitle,
    visibility: currentState === 'draft' || currentState === 'deleted' ? 'private' : 'public',
    state: currentState,
    createdAt: '2026-08-31T12:00:00.000Z',
    endsAt: currentState === 'draft' ? null : '2099-01-01T00:00:00.000Z',
    totalVotes: 0,
    templateGroup: { id: 'g_v1_lifecycle', name: 'Lifecycle group', description: 'Snapshot' },
    templateSnapshotOptions: [{ number: 1, text: 'Yes' }, { number: 2, text: 'No' }],
    options: [{ number: 1, text: 'Yes' }, { number: 2, text: 'No' }],
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf-token', headerName: 'X-XSRF-TOKEN' } });
    if (url.endsWith('/admin/session')) return route.fulfill({ status: 204 });
    if (url.endsWith('/admin/template-catalog/groups') && request.method() === 'GET') return route.fulfill({ json: [{ id: 'g_v1_lifecycle', name: 'Lifecycle group', description: '' }] });
    if (url.endsWith('/admin/template-catalog/groups/g_v1_lifecycle/templates')) return route.fulfill({ json: [{ id: 't_v1_yes', name: 'Yes' }] });
    if (url.endsWith('/admin/polls') && request.method() === 'POST') { state = 'draft'; return route.fulfill({ status: 201, json: poll() }); }
    if (url.endsWith('/admin/polls') && request.method() === 'GET') return route.fulfill({ json: permanentlyDeleted ? [] : [poll()] });
    if (url.endsWith('/publication') && request.method() === 'PUT') { state = 'expired'; return route.fulfill({ json: poll('active') }); }
    if (url.endsWith('/archive') && request.method() === 'PUT') { state = 'archived'; return route.fulfill({ json: poll() }); }
    if (url.endsWith('/restore-from-archive') && request.method() === 'PUT') { state = 'expired'; return route.fulfill({ json: poll('expired') }); }
    if (url.endsWith('/p_v1_lifecycle') && request.method() === 'DELETE') { state = 'deleted'; return route.fulfill({ json: poll('deleted') }); }
    if (url.endsWith('/permanent-deletion') && request.method() === 'POST') { permanentlyDeleted = true; return route.fulfill({ status: 204 }); }
    return route.fulfill({ json: [] });
  });
  page.on('dialog', async (dialog) => { await dialog.accept(); });

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/admin/create');
  await page.getByLabel('Poll-Titel').fill(lifecycleTitle);
  await page.getByLabel('Vorlagengruppe').selectOption('g_v1_lifecycle');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: lifecycleTitle, level: 4 })).toBeVisible();
  await expect(page.locator('.poll-admin-card')).not.toContainText('p_v1_lifecycle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.getByLabel('Veröffentlichen').fill('2099-01-01T12:00');
  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(page.getByText('abgelaufen')).toBeVisible();
  await page.getByRole('button', { name: 'Archivieren' }).click();
  await expect(page.getByText('archiviert')).toBeVisible();
  await page.getByRole('button', { name: 'Aus Archiv wiederherstellen' }).click();
  await expect(page.getByText('abgelaufen')).toBeVisible();
  await page.getByRole('button', { name: 'Soft löschen' }).click();
  await expect(page.getByText('gelöscht')).toBeVisible();
  await page.getByRole('button', { name: 'Permanent löschen' }).click();
  await expect(page.getByText('Noch keine Daten vorhanden')).toBeVisible();
});

test('keeps the template catalog usable at 320px with long names', async ({ page }) => {
  const longGroupName = 'TemplateGroupNameThatMustWrapAt320pxWithoutSpaces';
  const longTemplateName = 'An option template name that must remain readable at 320px';
  const longMembershipName = 'MembershipNameThatMustWrapAt320pxWithoutSpaces';
  await page.setViewportSize({ width: 320, height: 720 });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/admin/session')) return route.fulfill({status: 204});
    if (url.endsWith('/admin/template-catalog/groups') && request.method() === 'GET') {
      return route.fulfill({json: [{id: 'g_v1_catalog', name: longGroupName, description: ''}]});
    }
    if (url.endsWith('/admin/template-catalog/groups/g_v1_catalog/templates')) {
      return route.fulfill({json: [{id: 't_v1_catalog', name: longMembershipName}]});
    }
    if (url.endsWith('/admin/template-catalog/templates') && request.method() === 'GET') {
      return route.fulfill({json: [{id: 't_v1_catalog', name: longTemplateName}]});
    }
    return route.fulfill({json: []});
  });

  await page.goto('/admin/groups');
  await expect(page.getByRole('button', {name: longGroupName})).toBeVisible();
  await expect(page.getByText(longMembershipName)).toBeVisible();
  await page.getByLabel('Gruppe umbenennen').focus();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.goto('/admin/templates');
  await expect(page.getByText(longTemplateName)).toBeVisible();
  await page.getByLabel('Vorlagen suchen').focus();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
