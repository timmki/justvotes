import { expect, test } from '@playwright/test';

test('loads the app shell on a deep client route', async ({ page }) => {
  await page.goto('/poll/example');

  await expect(page.getByRole('heading', { name: 'JustVotes' })).toBeVisible();
  await page.getByRole('link', { name: 'Polls' }).click();
  await expect(page).toHaveURL(/\/polls$/);
});
