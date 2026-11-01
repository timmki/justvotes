import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env.CI);

// CI tests the built bundle: the dev server's unbundled modules overload WebKit on the runners.
let serverCommand = 'pnpm dev --host 127.0.0.1 --port 4173';
if (ci) serverCommand = 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort';

export default defineConfig({
  testDir: './e2e',
  retries: Number(ci),
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: serverCommand,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !ci,
  },
});
