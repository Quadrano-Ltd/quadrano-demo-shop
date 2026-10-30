import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { SHOP_CONTAINER_ID } from './e2e/fixtures.ts';

// Vite resolves --outDir relative to the Vite root (site/), so use an absolute
// path and quote it in the shell command. Forward slashes keep it cmd-safe.
const e2eDist = resolve(import.meta.dirname, '.e2e-dist').replace(/\\/g, '/');

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  reporter: 'list',
  retries: 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /container\.spec\.ts/,
    },
    {
      name: 'container-x10',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /container\.spec\.ts/,
      repeatEach: 10,
    },
  ],
  webServer: {
    command:
      `pnpm exec vite build --outDir "${e2eDist}" && ` +
      `pnpm exec vite preview --outDir "${e2eDist}" --host 127.0.0.1 --port 4173 --strictPort`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_GTM_CONTAINER_ID: SHOP_CONTAINER_ID },
  },
});
