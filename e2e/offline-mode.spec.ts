import AxeBuilder from '@axe-core/playwright';
import type { BrowserContext, ConsoleMessage, Page } from '@playwright/test';

import { expect, openMenu, pushedEntries, test } from './fixtures.ts';
import {
  OFFLINE_SNIPPET_KEY,
  SNIPPET_AFTER_STEP8,
  SNIPPET_BEFORE_STEP8,
  specIdOf,
} from './snippets.ts';

/**
 * FR-021 offline mode (contract demo-shop-offline-mode.md).
 *
 * Runs in the `offline` Playwright project against the offline build served on
 * port 4174. Each offline test aborts every non-local request, mirroring the
 * venue with the network off (GTM never loads). The production build is tested
 * by navigating to the production server on port 4173.
 *
 * The expected Console groups and lines are the shop's own contract, verbatim
 * (`kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`), not a copy
 * of the runtime's wording: that is what "same lines as production" means.
 */

const PRODUCTION_ORIGIN = 'http://127.0.0.1:4173';

const INVALID_STATUS =
  "That isn't a Quadrano snippet. Copy it again from Get snippet.";

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface ExpectedScenario {
  readonly button: string;
  readonly group: string;
  readonly details: string[];
}

const EXPECTED_SCENARIOS: readonly ExpectedScenario[] = [
  { button: 'add_to_cart', group: '✓ add_to_cart', details: [] },
  { button: 'purchase · Correct', group: '✓ purchase', details: [] },
  {
    button: 'purchase · 1 · Missing value',
    group: '✗ purchase · 1 error',
    details: ['ecommerce.value is required, but is missing.'],
  },
  {
    button: 'purchase · 2 · Value as text',
    group: '✗ purchase · 1 error',
    details: ['ecommerce.value should be a number, but got "12.99".'],
  },
  {
    button: 'purchase · 3 · Wrong-case key',
    group: '✗ purchase · 1 error, 1 warning',
    details: [
      'ecommerce.transaction_id is required, but is missing.',
      "ecommerce.transactionId isn't in the Event Definition. Did you mean transaction_id?",
    ],
  },
  {
    button: 'purchase · 4 · Lower-case currency',
    group: '✗ purchase · 1 error',
    details: [
      'ecommerce.currency should be one of "GBP", "EUR", "USD", but got "gbp".',
    ],
  },
  {
    button: 'purchase · Spare · Bad transaction ID',
    group: '✗ purchase · 1 error',
    details: [
      'ecommerce.transaction_id should match the pattern ^T-[0-9]{6}$, but got "12345".',
    ],
  },
];

interface ConsoleRecord {
  readonly type: string;
  readonly text: string;
  readonly args: readonly string[];
}

async function captureConsole(
  page: Page,
  action: () => Promise<void>,
): Promise<ConsoleRecord[]> {
  const pending: Array<{ type: string; text: string; args: Promise<string[]> }> =
    [];
  const handler = (message: ConsoleMessage): void => {
    pending.push({
      type: message.type(),
      text: message.text(),
      args: Promise.all(
        message.args().map(async (arg) => {
          try {
            const value: unknown = await arg.jsonValue();
            return typeof value === 'string' ? value : String(value);
          } catch {
            return '';
          }
        }),
      ),
    });
  };
  page.on('console', handler);
  try {
    await action();
  } finally {
    page.off('console', handler);
  }
  const records: ConsoleRecord[] = [];
  for (const entry of pending) {
    records.push({ type: entry.type, text: entry.text, args: await entry.args });
  }
  return records;
}

/**
 * The visible group line (`marker + ' ' + header`). Playwright's `text()` does
 * not substitute `%c` style specifiers, so the header is read from the group's
 * last argument and the marker from the format string.
 */
function groups(records: ConsoleRecord[]): string[] {
  const lines: string[] = [];
  for (const record of records) {
    if (record.type !== 'startGroupCollapsed') continue;
    // `console.groupCollapsed('%c' + marker + '%c %s', style, '', header)`:
    // the format string is the first argument and the header the last.
    const format = record.args[0] ?? '';
    const header = record.args[3];
    const marker = /^%c([✓✗⚠])/.exec(format)?.[1];
    if (marker === undefined || header === undefined) {
      lines.push(record.text);
      continue;
    }
    lines.push(marker + ' ' + header);
  }
  return lines;
}

function detailLines(records: ConsoleRecord[]): string[] {
  return records
    .filter(
      (record) =>
        record.type === 'log' && !record.text.startsWith('Pushed:'),
    )
    .map((record) => record.text);
}

function mentionsQuadrano(records: ConsoleRecord[]): boolean {
  return records.some((record) => /Quadrano|[✓✗⚠]/.test(record.text));
}

async function abortNonLocal(context: BrowserContext): Promise<void> {
  await context.route('**/*', (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      return route.continue();
    }
    return route.abort();
  });
}

async function waitForRuntime(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const quadrano = (
      window as unknown as { _quadrano?: { __q?: { specId?: unknown } } }
    )._quadrano;
    return typeof quadrano?.__q?.specId === 'string';
  });
}

async function readOffline(page: Page): Promise<string | null> {
  return page.evaluate(
    (key) => window.sessionStorage.getItem(key),
    OFFLINE_SNIPPET_KEY,
  );
}

async function seedOffline(page: Page, snippet: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ([key, value]) => window.sessionStorage.setItem(key, value),
    [OFFLINE_SNIPPET_KEY, snippet] as const,
  );
  await page.reload();
  await waitForRuntime(page);
}

test.beforeEach(async ({ page }) => {
  await abortNonLocal(page.context());
});

test('no snippet: the playground logs nothing (positive control)', async ({
  page,
}) => {
  await page.goto('/');

  const records = await captureConsole(page, async () => {
    await openMenu(page);
    for (const scenario of EXPECTED_SCENARIOS) {
      await page.getByRole('button', { name: scenario.button }).click();
    }
  });

  expect(groups(records)).toEqual([]);
  expect(mentionsQuadrano(records)).toBe(false);

  // The pushes still happen (the playground is unchanged); nothing reads them.
  const layer = await pushedEntries(page);
  expect(layer.length).toBeGreaterThanOrEqual(EXPECTED_SCENARIOS.length * 2);
});

test('before-step-8 snippet: each button logs its contract line', async ({
  page,
}) => {
  await page.goto('/');

  // The honest paste flow: paste into the panel, store, then reload.
  const textarea = page.getByLabel('Paste the snippet from Get snippet');
  await textarea.fill(SNIPPET_BEFORE_STEP8);
  await page.getByRole('button', { name: 'Use this snippet' }).click();
  await expect(page.locator('#offline-mode-status')).toHaveText(
    `Snippet loaded for Specification ${specIdOf(SNIPPET_BEFORE_STEP8)}. Reload any page to use it.`,
  );
  expect(await readOffline(page)).toBe(SNIPPET_BEFORE_STEP8);

  await page.reload();
  await waitForRuntime(page);
  await openMenu(page);

  for (const scenario of EXPECTED_SCENARIOS) {
    const records = await captureConsole(page, async () => {
      await page.getByRole('button', { name: scenario.button }).click();
    });
    expect(groups(records)).toEqual([scenario.group]);
    expect(detailLines(records)).toEqual(scenario.details);
  }
});

test('after-step-8 snippet: purchase · Correct logs the coupon line only', async ({
  page,
}) => {
  await seedOffline(page, SNIPPET_AFTER_STEP8);
  await openMenu(page);

  const records = await captureConsole(page, async () => {
    await page.getByRole('button', { name: 'purchase · Correct' }).click();
  });

  expect(groups(records)).toEqual(['✗ purchase · 1 error']);
  expect(detailLines(records)).toEqual([
    'ecommerce.coupon is required, but is missing.',
  ]);
});

test('invalid pastes are refused, stored nowhere, and the shop keeps working', async ({
  page,
}) => {
  await page.goto('/');

  const invalidPastes = [
    'not a snippet at all',
    `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});})(window,document,'script','dataLayer','${[
      'GTM',
      'AB12CD',
    ].join('-')}');</script>`,
    '<script>one</script><script>two</script>',
  ];

  const textarea = page.getByLabel('Paste the snippet from Get snippet');

  for (const paste of invalidPastes) {
    await textarea.fill(paste);
    await page.getByRole('button', { name: 'Use this snippet' }).click();

    await expect(page.locator('#offline-mode-status')).toHaveText(INVALID_STATUS);
    expect(await readOffline(page)).toBeNull();
  }

  // The playground still pushes after a refusal.
  await openMenu(page);
  const before = (await pushedEntries(page)).length;
  await page.getByRole('button', { name: 'add_to_cart' }).click();
  expect((await pushedEntries(page)).length - before).toBe(2);
});

test('clear removes the stored snippet and shows the none status', async ({
  page,
}) => {
  await seedOffline(page, SNIPPET_BEFORE_STEP8);

  const textarea = page.getByLabel('Paste the snippet from Get snippet');
  await textarea.fill(SNIPPET_BEFORE_STEP8);
  await page.getByRole('button', { name: 'Clear' }).click();

  await expect(page.locator('#offline-mode-status')).toHaveText(
    'No snippet loaded. The Event playground will log nothing.',
  );
  expect(await readOffline(page)).toBeNull();
});

test('production build: panel absent and a hand-set storage key runs nothing', async ({
  page,
}) => {
  await page.goto(`${PRODUCTION_ORIGIN}/`);

  await expect(page.locator('#offline-mode')).toHaveCount(0);

  await page.evaluate(
    ([key, value]) => window.sessionStorage.setItem(key, value),
    [OFFLINE_SNIPPET_KEY, SNIPPET_BEFORE_STEP8] as const,
  );

  const records = await captureConsole(page, async () => {
    await page.reload();
    await page.waitForLoadState('load');
  });

  expect(groups(records)).toEqual([]);
  expect(mentionsQuadrano(records)).toBe(false);

  const runtimeInstalled = await page.evaluate(
    () =>
      typeof (
        window as unknown as { _quadrano?: unknown }
      )._quadrano !== 'undefined',
  );
  expect(runtimeInstalled).toBe(false);
});

test('offline panel passes the axe A/AA matrix', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#offline-mode')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual(
    [],
  );
});
