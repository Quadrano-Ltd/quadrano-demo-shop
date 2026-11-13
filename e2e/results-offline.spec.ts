import type { BrowserContext, Page } from '@playwright/test';

import { expect, openMenu, test } from './fixtures.ts';
import {
  PLAYGROUND_LABELS,
  RESULTS_VIEW_KEY,
  expectedResults,
  readRow,
  recordConsole,
  rowCount,
} from './results-helpers.ts';
import { OFFLINE_SNIPPET_KEY, SNIPPET_BEFORE_STEP8 } from './snippets.ts';

/**
 * FR-009 and NFR-003 on the offline path, and the proof that the capture
 * script runs before the offline boot step (R-01, contract
 * console-capture.md). Runs in the `offline` Playwright project against the
 * offline build on port 4174.
 *
 * Expected text comes from the Console arguments captured in the same run,
 * never from strings typed into the test (plan IC-04).
 */

const RESULTS_VIEW_VALUE = 'on';

/** Block every non-local request, so GTM never loads (same as offline-mode). */
async function abortNonLocal(context: BrowserContext): Promise<void> {
  await context.route('**/*', (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      return route.continue();
    }
    return route.abort();
  });
}

/** Store the snippet and the Results setting, then load `path` in the same tab. */
async function seed(page: Page, path = '/'): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ([snippetKey, snippet, viewKey]) => {
      window.sessionStorage.setItem(snippetKey, snippet);
      window.sessionStorage.setItem(viewKey, 'on');
    },
    [OFFLINE_SNIPPET_KEY, SNIPPET_BEFORE_STEP8, RESULTS_VIEW_KEY] as const,
  );
  await page.goto(path);
}

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`missing ${label}`);
  }
  return value;
}

test.beforeEach(async ({ page }) => {
  await abortNonLocal(page.context());
});

test('the banner is seen from the head before the offline boot step', async ({
  page,
}) => {
  await seed(page);

  // No waiting helper: the capture script wraps the Console before the boot
  // step injects the snippet, so the banner must already be seen on arrival.
  expect(
    await page.evaluate(() => window.__demoShopResults?.bannerSeen),
  ).toBe(true);

  // The built page holds the capture script before the offline boot marker.
  const html = await (await page.request.get('/')).text();
  const captureIndex = html.indexOf('demo-shop:results-view');
  const bootIndex = html.indexOf('quadrano-demo-shop:offline-mode');
  expect(captureIndex).toBeGreaterThanOrEqual(0);
  expect(bootIndex).toBeGreaterThanOrEqual(0);
  expect(captureIndex).toBeLessThan(bootIndex);
});

test('each playground press adds one row equal to its Console group', async ({
  page,
}) => {
  await seed(page);
  await openMenu(page);

  for (const [index, label] of PLAYGROUND_LABELS.entries()) {
    const calls = await recordConsole(page, async () => {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('li.results__row')).toHaveCount(index + 1);
    });
    const expected = expectedResults(calls);
    expect(expected).toHaveLength(1);
    expect(await readRow(page, 0)).toEqual(must(expected[0], 'expected result'));
  }
});

test('no snippet stored: the empty state stays and a press adds no row', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(
    ([viewKey, value]) => window.sessionStorage.setItem(viewKey, value),
    [RESULTS_VIEW_KEY, RESULTS_VIEW_VALUE] as const,
  );
  await page.goto('/');
  await openMenu(page);

  await expect(page.locator('p.results__empty')).toHaveText(
    "Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.",
  );
  expect(await rowCount(page)).toBe(0);

  await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
  expect(await rowCount(page)).toBe(0);
});

test('the link turns the view on in the offline build', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    ([snippetKey, snippet]) => window.sessionStorage.setItem(snippetKey, snippet),
    [OFFLINE_SNIPPET_KEY, SNIPPET_BEFORE_STEP8] as const,
  );

  await page.goto('/?results=on');
  await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
  expect(
    await page.evaluate(() => window.__demoShopResults?.bannerSeen),
  ).toBe(true);

  await openMenu(page);
  await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
  await expect(page.locator('li.results__row')).toHaveCount(1);
});

test('the view stays on after moving pages by the header link', async ({
  page,
}) => {
  await seed(page);

  await page.getByRole('link', { name: /Basket/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
  expect(
    await page.evaluate(() => window.__demoShopResults?.bannerSeen),
  ).toBe(true);
  expect(await rowCount(page)).toBe(0);
});
