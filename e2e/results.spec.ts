import {
  expect,
  openMenu,
  pushedEntries,
  savedValue,
  seedSaved,
  test,
  visitorContainerId,
} from './fixtures.ts';
import {
  PLAYGROUND_LABELS,
  consoleIsNative,
  consoleText,
  expectedResults,
  openWithResults,
  readRow,
  recordConsole,
  rowCount,
  serveSnippetAsGtm,
  waitForBanner,
  type ConsoleCall,
  type ExpectedResult,
} from './results-helpers.ts';
import { SNIPPET_BEFORE_STEP8, scriptBodyOf } from './snippets.ts';

/**
 * FR-001, FR-002, FR-003, FR-007, FR-008, FR-009, FR-010, NFR-003, SC-001
 * (contracts/results-view.md, contracts/console-capture.md).
 *
 * The rule that makes this suite worth having: expected text comes from the
 * Console arguments captured in the same run, never from strings typed into
 * the test. The only typed strings are the shop's own copy, button names, and
 * text the test itself wrote to the Console.
 */

const BANNER_NOT_SEEN =
  "Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.";
const NO_OUTPUT_YET = 'No output yet';

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`missing ${label}`);
  }
  return value;
}

function parsePushedObject(pushed: string): unknown {
  const prefix = 'Pushed: ';
  if (!pushed.startsWith(prefix)) {
    return undefined;
  }
  try {
    return JSON.parse(pushed.slice(prefix.length)) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Compare a row against the Console group from the same run. Header and lines
 * are compared as text; the pushed block falls back to a parsed-object
 * comparison only when the two strings differ (key-order-only differences).
 */
function expectRowMatches(actual: ExpectedResult, expected: ExpectedResult): void {
  expect(actual.header).toBe(expected.header);
  expect(actual.lines).toEqual(expected.lines);

  const actualPushed = actual.pushed;
  const expectedPushed = expected.pushed;
  if (actualPushed === expectedPushed) {
    return;
  }
  if (actualPushed === null || expectedPushed === null) {
    expect(actualPushed).toBe(expectedPushed);
    return;
  }

  const actualObject = parsePushedObject(actualPushed);
  const expectedObject = parsePushedObject(expectedPushed);
  if (actualObject !== undefined && expectedObject !== undefined) {
    expect(actualObject).toEqual(expectedObject);
    return;
  }
  expect(actualPushed).toBe(expectedPushed);
}

function runtimeLoaded(): boolean {
  const quadrano = (
    window as unknown as { _quadrano?: { __q?: { specId?: unknown } } }
  )._quadrano;
  return typeof quadrano?.__q?.specId === 'string';
}

/** Press all 7 playground buttons, waiting for all 14 data layer pushes. */
async function pressAllSeven(page: import('@playwright/test').Page): Promise<void> {
  const before = (await pushedEntries(page)).length;
  for (const label of PLAYGROUND_LABELS) {
    await page.getByRole('button', { name: label, exact: true }).click();
  }
  await page.waitForFunction(
    (count) => {
      const layer = window.dataLayer;
      if (!Array.isArray(layer)) {
        return false;
      }
      const nonGtm = layer.filter((entry) => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }
        const event = (entry as { event?: unknown }).event;
        return typeof event !== 'string' || !event.startsWith('gtm.');
      });
      return nonGtm.length >= count;
    },
    before + PLAYGROUND_LABELS.length * 2,
  );
}

function normaliseValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/T-\d{6}/g, 'T-000000');
  }
  if (Array.isArray(value)) {
    return value.map(normaliseValue);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = normaliseValue(entry);
    }
    return out;
  }
  return value;
}

function normaliseCalls(
  calls: readonly ConsoleCall[],
): Array<{ type: string; args: unknown[] }> {
  return calls.map((call) => ({
    type: call.type,
    args: normaliseValue([...call.args]) as unknown[],
  }));
}

test('each playground press adds one row equal to its Console group', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  for (const [index, label] of PLAYGROUND_LABELS.entries()) {
    const calls = await recordConsole(page, async () => {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('li.results__row')).toHaveCount(index + 1);
    });
    const expected = expectedResults(calls);
    expect(expected).toHaveLength(1);
    expectRowMatches(await readRow(page, 0), must(expected[0], 'expected result'));
  }
});

test('rows stay in reverse order of pressing and keep their own expanded state', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const headers: string[] = [];
  const pressed = ['add_to_cart', 'purchase · Correct', 'purchase · 1 · Missing value'];
  for (const label of pressed) {
    const calls = await recordConsole(page, async () => {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('li.results__row')).toHaveCount(headers.length + 1);
    });
    const results = expectedResults(calls);
    expect(results).toHaveLength(1);
    headers.push(must(results[0], 'expected result').header);
  }

  // Newest first: the list holds the three in reverse order of pressing.
  await expect(page.locator('summary.results__header').nth(0)).toHaveText(
    must(headers[2], 'header 2'),
  );
  await expect(page.locator('summary.results__header').nth(1)).toHaveText(
    must(headers[1], 'header 1'),
  );
  await expect(page.locator('summary.results__header').nth(2)).toHaveText(
    must(headers[0], 'header 0'),
  );

  const row0 = page.locator('li.results__row').nth(0);
  const row1 = page.locator('li.results__row').nth(1);
  const row2 = page.locator('li.results__row').nth(2);

  await row1.locator('summary.results__header').click();
  await row2.locator('summary.results__header').click();
  await expect(row1.locator('details.results__result')).toHaveAttribute('open', '');
  await expect(row2.locator('details.results__result')).toHaveAttribute('open', '');

  await row1.locator('summary.results__header').click();
  await expect(row1.locator('details.results__result')).not.toHaveAttribute('open', '');
  await expect(row2.locator('details.results__result')).toHaveAttribute('open', '');
  await expect(row0.locator('details.results__result')).not.toHaveAttribute('open', '');

  // A fourth press prepends; the still-open row moves down to index 3.
  await recordConsole(page, async () => {
    await page
      .getByRole('button', { name: 'purchase · 2 · Value as text', exact: true })
      .click();
    await expect(page.locator('li.results__row')).toHaveCount(4);
  });
  await expect(
    page.locator('li.results__row').nth(3).locator('details.results__result'),
  ).toHaveAttribute('open', '');
  await expect(
    page.locator('li.results__row').nth(0).locator('details.results__result'),
  ).not.toHaveAttribute('open', '');
});

test('a push with no problems has no lines and a pushed block', async ({ page }) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const calls = await recordConsole(page, async () => {
    await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
    await expect(page.locator('li.results__row')).toHaveCount(1);
  });
  const results = expectedResults(calls);
  expect(results).toHaveLength(1);
  expectRowMatches(await readRow(page, 0), must(results[0], 'expected result'));

  await expect(page.locator('li.results__row').nth(0).locator('p.results__line')).toHaveCount(
    0,
  );
  await expect(
    page.locator('li.results__row').nth(0).locator('pre.results__pushed'),
  ).toHaveCount(1);
});

test("a visitor's own container: one press adds one row equal to its Console group", async ({
  page,
  gtm,
}) => {
  const visitorId = visitorContainerId();
  await seedSaved(page, gtm, savedValue(visitorId, Date.now()));
  await serveSnippetAsGtm(page);

  const gtmIds: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('https://www.googletagmanager.com/gtm.js?')) {
      gtmIds.push(new URL(url).searchParams.get('id') ?? '');
    }
  });

  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const calls = await recordConsole(page, async () => {
    await page
      .getByRole('button', { name: must(PLAYGROUND_LABELS[2], 'label 2'), exact: true })
      .click();
    await expect(page.locator('li.results__row')).toHaveCount(1);
  });
  const results = expectedResults(calls);
  expect(results).toHaveLength(1);
  expectRowMatches(await readRow(page, 0), must(results[0], 'expected result'));

  expect(gtmIds).toEqual([visitorId]);
});

test('the two empty states are told apart by the banner', async ({ page }) => {
  // Empty gtm.js stub: the runtime never loads, so the banner is never seen.
  await openWithResults(page);
  await openMenu(page);
  await expect(page.locator('p.results__empty')).toHaveText(BANNER_NOT_SEEN);
  expect(await rowCount(page)).toBe(0);

  // Served snippet: the banner arrives, so the state becomes "No output yet".
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);
  await expect(page.locator('p.results__empty')).toHaveText(NO_OUTPUT_YET);
  expect(await rowCount(page)).toBe(0);
});

test('the banner swaps the empty state without a reload', async ({ page }) => {
  await openWithResults(page);
  await openMenu(page);
  await expect(page.locator('p.results__empty')).toHaveText(BANNER_NOT_SEEN);

  const urlBefore = page.url();
  await page.addScriptTag({ content: scriptBodyOf(SNIPPET_BEFORE_STEP8) });

  await expect(page.locator('p.results__empty')).toHaveText(NO_OUTPUT_YET);
  expect(page.url()).toBe(urlBefore);
  expect(await rowCount(page)).toBe(0);
});

test("another script's Console output stays out of Results", async ({ page }) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const foreignCalls = await recordConsole(page, () =>
    page.evaluate(() => {
      console.groupCollapsed('Another script');
      console.log('inside another group');
      console.groupEnd();
      console.log('a loose line');
      console.info('Quadrano mentioned without its shape');
    }),
  );
  expect(foreignCalls).toHaveLength(5);
  expect(await rowCount(page)).toBe(0);

  // Control: the runtime's own group does appear.
  const calls = await recordConsole(page, async () => {
    await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
    await expect(page.locator('li.results__row')).toHaveCount(1);
  });
  expect(expectedResults(calls)).toHaveLength(1);
});

test('a foreign group nested inside a result is dropped', async ({ page }) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  await page.evaluate(() => {
    console.groupCollapsed('%c?%c %s', '', '', 'outer header');
    console.log('kept one');
    console.group('nested, not ours');
    console.log('dropped');
    console.groupEnd();
    console.log('kept two');
    console.groupEnd();
  });

  await expect(page.locator('li.results__row')).toHaveCount(1);
  const row = page.locator('li.results__row').nth(0);
  await expect(row.locator('summary.results__header')).toHaveText('? outer header');
  await expect(row.locator('p.results__line')).toHaveText(['kept one', 'kept two']);
  await expect(row.locator('pre.results__pushed')).toHaveCount(0);
});

test('an event with no Event Definition shows as a plain row', async ({ page }) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const calls = await recordConsole(page, async () => {
    await page.evaluate(() => {
      window.dataLayer?.push({ event: 'not_in_the_specification' });
    });
    await expect(page.locator('li.results__row')).toHaveCount(1);
  });

  const infoCall = calls.find(
    (call) =>
      call.type === 'info' &&
      typeof call.args[0] === 'string' &&
      call.args[0].startsWith('%cQuadrano%c'),
  );
  expect(infoCall).toBeDefined();
  if (infoCall === undefined) {
    throw new Error('expected a branded info call');
  }

  const row = page.locator('li.results__row').nth(0);
  await expect(row.locator('p.results__plain')).toHaveCount(1);
  await expect(row.locator('p.results__plain')).toHaveText(consoleText(infoCall.args));
  await expect(row.locator('details.results__result')).toHaveCount(0);
});

test('markup-like text in a pushed value is shown as text', async ({ page }) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const markup = '<img src=x onerror="window.__hit = true">';
  const calls = await recordConsole(page, async () => {
    await page.evaluate((value) => {
      window.dataLayer?.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'GBP',
          value: 12.99,
          items: [
            { item_id: 'SKU-1001', item_name: value, price: 12.99, quantity: 1 },
          ],
        },
      });
    }, markup);
    await expect(page.locator('li.results__row')).toHaveCount(1);
  });

  const results = expectedResults(calls);
  expect(results).toHaveLength(1);
  expectRowMatches(await readRow(page, 0), must(results[0], 'expected result'));

  const rowText = (await page.locator('li.results__row').nth(0).textContent()) ?? '';
  // The pushed value is rendered as JSON text, so the quotes are escaped; the
  // markup is present as text, never parsed into an element.
  const escapedMarkup = JSON.stringify(markup).slice(1, -1);
  expect(rowText).toContain(escapedMarkup);
  await expect(page.locator('section.results img')).toHaveCount(0);
  const hit = await page.evaluate(
    () => (window as unknown as { __hit?: unknown }).__hit,
  );
  expect(hit).toBeUndefined();
});

test('the banner is not a row', async ({ page }) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  expect(await rowCount(page)).toBe(0);
  await expect(page.locator('p.results__empty')).toHaveText(NO_OUTPUT_YET);
});

test('the Console records for the 7 presses are equal with the view on and off', async ({
  page,
}) => {
  // Run A: view off. Wait for the runtime by its banner line during load.
  await serveSnippetAsGtm(page);
  const bannerSeen = page.waitForEvent('console', {
    predicate: (message) =>
      message.type() === 'info' && message.text().includes('Console format v1'),
  });
  await page.goto('/');
  await bannerSeen;
  await page.waitForFunction(runtimeLoaded);
  expect(await consoleIsNative(page)).toBe(true);
  await openMenu(page);
  const runA = await recordConsole(page, () => pressAllSeven(page));

  // Run B: view on, a fresh page in the same context.
  const pageB = await page.context().newPage();
  try {
    await serveSnippetAsGtm(pageB);
    await openWithResults(pageB);
    await waitForBanner(pageB);
    expect(await consoleIsNative(pageB)).toBe(false);
    await openMenu(pageB);
    const runB = await recordConsole(pageB, () => pressAllSeven(pageB));

    expect(normaliseCalls(runA)).toEqual(normaliseCalls(runB));
  } finally {
    await pageB.close();
  }
});

test('at most 50 rows are kept, newest first', async ({ page }) => {
  await openWithResults(page);
  await page.evaluate(() => {
    for (let n = 1; n <= 51; n += 1) {
      console.groupCollapsed('%c?%c %s', '', '', `entry ${n}`);
      console.groupEnd();
    }
  });
  await openMenu(page);

  await expect(page.locator('li.results__row')).toHaveCount(50);
  await expect(page.locator('summary.results__header').nth(0)).toHaveText('? entry 51');
  await expect(page.locator('summary.results__header').nth(49)).toHaveText('? entry 2');
  const entryCount = await page.evaluate(() => window.__demoShopResults?.entries.length);
  expect(entryCount).toBe(50);
});

test('an entry written before the menu mounts is shown after it mounts', async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') {
        console.groupCollapsed('%c?%c %s', '', '', 'before mount');
        console.groupEnd();
      }
    });
  });
  await openWithResults(page);
  await openMenu(page);

  await expect(page.locator('li.results__row')).toHaveCount(1);
  await expect(page.locator('summary.results__header')).toHaveText('? before mount');
  await expect(page.locator('#results-status')).toHaveText('? before mount');
});
