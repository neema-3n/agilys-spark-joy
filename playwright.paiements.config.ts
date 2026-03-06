import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/paiements-page.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 45175',
    url: 'http://127.0.0.1:45175',
    timeout: 180_000,
    reuseExistingServer: true,
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
