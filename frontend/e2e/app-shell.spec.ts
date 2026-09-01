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

  await page.goto('/poll/p_v1_vote');
  await expect(page.getByText('Ergebnisse werden nach der ersten Stimme freigegeben.')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Apfel' })).toBeVisible();
  await page.getByRole('radio', { name: 'Apfel' }).click();
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
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith('/polls/p_option_details/results')) return route.fulfill({ json: {
      id: 'p_option_details', title: 'Option details poll', visibility: 'public', state: 'expired',
      createdAt: '2026-08-31T12:00:00.000Z', endsAt: '2026-08-31T13:00:00.000Z', totalVotes: 2,
      options: [{ number: 7, text: 'Apfel', voteCount: 2, votes: [
        { userID: 'alice', votedAt: '2026-08-31T12:01:00.000Z' },
        { userID: 'bob', votedAt: '2026-08-31T12:02:00.000Z' },
      ] }],
    } });
    return route.fulfill({ json: [] });
  });

  await page.goto('/poll/results/p_option_details/option/7');
  await expect(page.getByRole('heading', { name: 'Apfel', level: 3 })).toBeVisible();
  await expect(page.getByText('alice')).toBeVisible();
  await expect(page.getByText('bob')).toBeVisible();
  await expect(page.locator('time').first()).toContainText('31.08.2026');
  await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-08-31T12:01:00.000Z');
});

test('renders zero percentages and tied winners in results', async ({ page }) => {
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
  await expect(page.getByText('0 %')).toHaveCount(2);
  await expect(page.locator('.results-total dd')).toHaveText('0');
  await expect(page.locator('.result-option-meta')).toHaveText(['0 %0 Stimmen', '0 %0 Stimmen']);
  await page.goto('/poll/results/p_tie_results');
  await expect(page.getByText('Gleichstand')).toHaveCount(2);
  await expect(page.locator('.result-option-heading a')).toHaveText(['Alpha', 'Zulu', 'Beta', 'Zebra']);
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
  await expect(page.getByText('Ergebnisse werden nach der ersten Stimme freigegeben.')).toBeVisible();
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
  await expect(page.locator('.admin-tabs').getByRole('link', { name: 'Stimmen' })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Stimmen', level: 3 })).toBeVisible();
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
  await expect(page.locator('.admin-vote-list').getByText('Browser poll')).toBeVisible();
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
  await expect(page.getByText('0 %')).toBeVisible();
  await page.goto('/poll/results/p_v1_browser/option/1');
  await expect(page.getByText('Noch keine Daten vorhanden')).toBeVisible();
  await expect(page.getByText('alice')).toHaveCount(0);
  await page.goto('/poll/audit/p_v1_browser');
  await expect(page.getByText('VoteRemovedByAdmin')).toBeVisible();
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

test('runs an admin poll through publication, expiry, archive, restore and destructive deletion', async ({ page }) => {
  let state: 'draft' | 'active' | 'expired' | 'archived' | 'deleted' = 'draft';
  let permanentlyDeleted = false;
  const poll = (currentState = state) => ({
    id: 'p_v1_lifecycle',
    title: 'Lifecycle poll',
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

  await page.goto('/admin/create');
  await page.getByLabel('Poll-Titel').fill('Lifecycle poll');
  await page.getByLabel('Vorlagengruppe').selectOption('g_v1_lifecycle');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Lifecycle poll', level: 4 })).toBeVisible();

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
