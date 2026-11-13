import type { Page, Request } from '@playwright/test';
import {
  expect,
  openMenu,
  PAGES,
  pushedEntries,
  savedValue,
  seedSaved,
  SHOP_CONTAINER_ID,
  STORAGE_KEY,
  test,
  visitorContainerId,
} from './fixtures.ts';
import {
  PLAYGROUND_LABELS,
  consoleIsNative,
  openWithResults,
  RESULTS_VIEW_KEY,
  rowCount,
  serveSnippetAsGtm,
  waitForBanner,
} from './results-helpers.ts';

/**
 * FR-004, FR-005, FR-006, FR-011, FR-012, C-002, SC-002, SC-003, SC-004
 * (contracts/results-view.md, contracts/console-capture.md).
 *
 * Every "nothing changed" claim has its control in the same test: the off
 * state is checked against the on state, a zero-push action is checked
 * against a press that pushes 2, and a crafted link that must not change the
 * container is checked to still turn the view on.
 */

/** The same address with `results=on` appended (the link form). */
function withResults(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}results=on`;
}

/** Request URLs for one navigation, in order. */
async function requestsFor(page: Page, url: string): Promise<string[]> {
  const seen: string[] = [];
  const onRequest = (request: Request): void => {
    seen.push(request.url());
  };
  page.on('request', onRequest);
  await page.goto(url);
  await page.waitForLoadState('load');
  page.off('request', onRequest);
  return seen;
}

/** Make `window.sessionStorage` throw before any page script runs. */
async function blockSessionStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
}

function readSessionSetting(page: Page): Promise<string | null> {
  return page.evaluate((key) => sessionStorage.getItem(key), RESULTS_VIEW_KEY);
}

function readStoredContainer(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

const SWITCH = '#results-switch';
const SWITCH_NOTE = '#results-switch-note';
const NORMAL_NOTE = 'The page reloads when you change this.';
const BLOCKED_NOTE =
  "This browser blocks site storage, so this view can't be remembered. Open the shop from the talk's link to see it on one page.";
const NO_OUTPUT_YET = 'No output yet';

test.describe('view off: native Console methods, no global, same requests (FR-005, SC-002)', () => {
  for (const path of PAGES) {
    test(`off state on ${path} matches its on control`, async ({ page }) => {
      // Off half first, in a fresh context: no stored setting can leak in.
      const off = await requestsFor(page, path);
      const offDocument = off[0];
      if (offDocument === undefined) {
        throw new Error('missing document request');
      }

      expect(await consoleIsNative(page)).toBe(true);
      await expect(page.locator('html')).not.toHaveAttribute('data-results-view');
      await expect(page.locator('html')).not.toHaveAttribute('data-results-storage');
      expect(await page.evaluate(() => '__demoShopResults' in window)).toBe(false);
      expect(await readSessionSetting(page)).toBeNull();
      await expect(page.locator('#results-status')).toHaveCount(0);

      // On, same page: the control.
      const on = await requestsFor(page, withResults(path));
      const onDocument = on[0];
      if (onDocument === undefined) {
        throw new Error('missing document request');
      }

      expect(await consoleIsNative(page)).toBe(false);
      await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');

      // Same requests: after dropping each document URL (they differ only by
      // the query), the two runs load the same assets and the one gtm.js call.
      const offRest = off.filter((url) => url !== offDocument).sort();
      const onRest = on.filter((url) => url !== onDocument).sort();
      expect(offRest).toEqual(onRest);

      // Every off-list URL is same-origin or the single gtm.js request.
      const external = offRest.filter((url) => !url.startsWith('http://127.0.0.1'));
      expect(external).toHaveLength(1);
      expect(external[0]).toMatch(/^https:\/\/www\.googletagmanager\.com\/gtm\.js\?/);
    });
  }
});

test.describe('the switch (FR-004)', () => {
  test('on by switch, still on on the next page, and off returns to native', async ({
    page,
  }) => {
    await serveSnippetAsGtm(page);
    await page.goto('/');
    await openMenu(page);

    const toggle = page.locator(SWITCH);
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute('role', 'switch');
    await expect(toggle).toHaveAttribute('aria-describedby', 'results-switch-note');
    await expect(page.locator(SWITCH_NOTE)).toHaveText(NORMAL_NOTE);

    // On by switch: the switch reloads the page and adds no results parameter.
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    expect(new URL(page.url()).searchParams.get('results')).toBeNull();
    expect(await readSessionSetting(page)).toBe('on');
    await waitForBanner(page);

    await openMenu(page);
    await expect(page.locator(SWITCH)).toBeChecked();

    // One press adds a row, so the empty state on the next page is real.
    await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
    await expect(page.locator('li.results__row')).toHaveCount(1);

    // A real navigation in the same tab keeps the view on and starts empty.
    await page.locator('nav[aria-label="Site"] a[href^="/basket/"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    await waitForBanner(page);
    await openMenu(page);
    expect(await rowCount(page)).toBe(0);
    await expect(page.locator('p.results__empty')).toHaveText(NO_OUTPUT_YET);

    // Off by switch: reload to /basket/ with native Console methods again.
    await page.locator(SWITCH).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
    expect(await consoleIsNative(page)).toBe(true);
    expect(await readSessionSetting(page)).toBeNull();
    expect(new URL(page.url()).pathname).toBe('/basket/');
  });

  test('a new tab starts with the view off (DM-01M78NYDDTDCEGEP0S4BDQDNKM)', async ({
    page,
    context,
  }) => {
    await page.goto('/?results=on');
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');

    const tab = await context.newPage();
    try {
      await tab.goto('/');
      await expect(tab.locator('html')).not.toHaveAttribute('data-results-view', 'on');
      expect(await readSessionSetting(tab)).toBeNull();
    } finally {
      await tab.close();
    }
  });

  test('with the view off the section holds only the heading, switch and note', async ({
    page,
  }) => {
    await page.goto('/');
    await openMenu(page);

    const section = page.locator('section.results');
    await expect(section.locator('h3')).toHaveText('Results');
    await expect(section.locator(SWITCH)).toHaveCount(1);
    await expect(section.locator(SWITCH_NOTE)).toHaveCount(1);
    await expect(section.locator('ul.results__list')).toHaveCount(0);
    await expect(section.locator('p.results__empty')).toHaveCount(0);
  });
});

test.describe('the link (FR-006)', () => {
  test('on as the switch does, and still on on the next page', async ({ page }) => {
    await page.goto('/?results=on');
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    expect(await readSessionSetting(page)).toBe('on');
    await openMenu(page);
    await expect(page.locator(SWITCH)).toBeChecked();

    await page.locator('nav[aria-label="Site"] a[href^="/checkout/"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    expect(new URL(page.url()).searchParams.get('results')).toBeNull();
  });

  test('turning the view off from a link-opened page does not come back', async ({
    page,
  }) => {
    await page.goto('/?results=on');
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    await openMenu(page);

    await page.locator(SWITCH).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
    expect(await consoleIsNative(page)).toBe(true);
    expect(new URL(page.url()).searchParams.get('results')).toBeNull();

    // Going back must not land on an address that turns the view on again.
    await page.goBack();
    await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
  });

  test.describe('other values change nothing', () => {
    const cases: ReadonlyArray<{ readonly address: string; readonly on: boolean }> = [
      { address: '/?results=off', on: false },
      { address: '/?results=', on: false },
      { address: '/?results', on: false },
      { address: '/?results=ON', on: false },
      { address: '/?results=1', on: false },
      { address: '/?xresults=on', on: false },
      { address: '/?results=on', on: true },
    ];

    for (const entry of cases) {
      test(entry.address, async ({ page }) => {
        await page.goto(entry.address);
        if (entry.on) {
          await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
        } else {
          await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
          expect(await consoleIsNative(page)).toBe(true);
          expect(await readSessionSetting(page)).toBeNull();
        }
      });
    }
  });

  test('an unrecognised value leaves an on view on', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.locator(SWITCH).click();
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');

    await page.goto('/?results=off');
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
  });

  test('the link works beside ?scenario= (R-03)', async ({ page }) => {
    for (const address of [
      '/checkout/?scenario=missing-value&results=on',
      '/checkout/?results=on&scenario=missing-value',
    ]) {
      await page.goto(address);
      await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
      await expect(page.locator('#scenario-select')).toHaveValue('missing-value');
    }

    await page.goto('/checkout/?results=on');
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    await expect(page.locator('#scenario-select')).toHaveValue('correct');
    expect(new URL(page.url()).searchParams.get('results')).toBe('on');
  });
});

test.describe('crafted links never change the container (C-002, SC-004, FR-013)', () => {
  const crafted = visitorContainerId('LINK01');
  const links = [
    `/?results=on&gtm=${crafted}`,
    `/?gtm_id=${crafted}&results=on`,
    `/?results=on&container=${crafted}#${crafted}`,
  ];

  for (const link of links) {
    test(link, async ({ page, gtm }) => {
      // No serveSnippetAsGtm here: the recorder must see the gtm.js request.
      await page.goto(link);
      await expect.poll(() => gtm.ids.length).toBe(1);
      await page.waitForTimeout(100);
      expect(gtm.ids).toEqual([SHOP_CONTAINER_ID]);
      await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
      await expect(page.locator('html')).not.toHaveAttribute('data-visitor-container');
      expect(await readStoredContainer(page)).toBeNull();
      // Control: the same link turns the view on.
      await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    });
  }

  test('a saved visitor container is neither set nor cleared by the link', async ({
    page,
    gtm,
  }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor, Date.now()));
    const storedBefore = await readStoredContainer(page);
    expect(storedBefore).not.toBeNull();

    gtm.reset();
    await page.goto('/?results=on');
    await expect.poll(() => gtm.ids.length).toBe(1);
    await page.waitForTimeout(100);
    expect(gtm.ids).toEqual([visitor]);
    expect(await readStoredContainer(page)).toBe(storedBefore);
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
  });
});

test.describe('storage blocked', () => {
  test('view off: the switch is disabled with the blocked note', async ({ page }) => {
    await blockSessionStorage(page);
    await page.goto('/');
    await openMenu(page);

    await expect(page.locator(SWITCH)).not.toBeChecked();
    await expect(page.locator(SWITCH)).toBeDisabled();
    await expect(page.locator(SWITCH_NOTE)).toHaveText(BLOCKED_NOTE);
  });

  test('the link turns the view on for this page only', async ({ page }) => {
    await blockSessionStorage(page);
    await page.goto('/?results=on');

    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    await expect(page.locator('html')).toHaveAttribute('data-results-storage', 'unavailable');
    expect(await page.evaluate(() => window.__demoShopResults?.storage)).toBe('unavailable');

    await openMenu(page);
    await expect(page.locator(SWITCH)).toBeChecked();
    await expect(page.locator(SWITCH)).toBeEnabled();

    // Nothing was remembered: the next page starts off.
    await page.locator('nav[aria-label="Site"] a[href^="/basket/"]').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');

    // Off still works from the link-opened page.
    await page.goto('/?results=on');
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    await openMenu(page);
    await page.locator(SWITCH).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
    expect(new URL(page.url()).searchParams.get('results')).toBeNull();
  });
});

test.describe('the view makes 0 pushes (FR-012, SC-003)', () => {
  test('menu, switch and rows push nothing; a press pushes 2', async ({ page }) => {
    await serveSnippetAsGtm(page);
    await openWithResults(page);
    await waitForBanner(page);
    await openMenu(page);

    await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
    await expect(page.locator('li.results__row')).toHaveCount(1);
    const base = (await pushedEntries(page)).length;

    // Close the menu.
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('#visitor-menu')).toBeHidden();
    expect((await pushedEntries(page)).length).toBe(base);

    // Open the menu.
    await openMenu(page);
    expect((await pushedEntries(page)).length).toBe(base);

    // Expand and collapse the row.
    const summary = page.locator('summary.results__header').nth(0);
    await summary.click();
    await expect(page.locator('details.results__result').nth(0)).toHaveAttribute('open', '');
    expect((await pushedEntries(page)).length).toBe(base);
    await summary.click();
    await expect(page.locator('details.results__result').nth(0)).not.toHaveAttribute(
      'open',
      '',
    );
    expect((await pushedEntries(page)).length).toBe(base);

    // Control: a playground press adds exactly its 2 entries.
    const beforePress = (await pushedEntries(page)).length;
    await page.getByRole('button', { name: 'add_to_cart', exact: true }).click();
    expect((await pushedEntries(page)).length).toBe(beforePress + 2);
  });

  test('page loads with the view on and off push nothing', async ({ page }) => {
    await page.goto('/');
    const n = (await pushedEntries(page)).length;

    // Switch on reloads.
    await openMenu(page);
    await page.locator(SWITCH).click();
    await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
    expect((await pushedEntries(page)).length).toBe(n);

    // Switch off reloads.
    await openMenu(page);
    await page.locator(SWITCH).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
    expect((await pushedEntries(page)).length).toBe(n);

    // A link-opened view in a fresh tab.
    const tab = await page.context().newPage();
    try {
      await tab.goto('/?results=on');
      await expect(tab.locator('html')).toHaveAttribute('data-results-view', 'on');
      expect((await pushedEntries(tab)).length).toBe(n);
    } finally {
      await tab.close();
    }
  });
});

test.describe('storage and requests unchanged with 7 results showing (FR-011)', () => {
  test('pressing all 7 stores nothing and sends nothing, and results do not survive a reload', async ({
    page,
    context,
  }) => {
    await serveSnippetAsGtm(page);
    await openWithResults(page);
    await waitForBanner(page);
    await openMenu(page);

    const snapshot = (): Promise<{
      session: Record<string, string>;
      local: Record<string, string>;
      cookie: string;
    }> =>
      page.evaluate(() => ({
        session: Object.fromEntries(Object.entries(window.sessionStorage)),
        local: Object.fromEntries(Object.entries(window.localStorage)),
        cookie: document.cookie,
      }));

    const before = await snapshot();
    const cookiesBefore = await context.cookies();

    const requestUrls: string[] = [];
    const onRequest = (request: Request): void => {
      requestUrls.push(request.url());
    };
    page.on('request', onRequest);

    for (const [index, label] of PLAYGROUND_LABELS.entries()) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('li.results__row')).toHaveCount(index + 1);
    }
    page.off('request', onRequest);

    // Control: 7 rows are showing.
    expect(await rowCount(page)).toBe(7);

    const after = await snapshot();
    expect(after).toEqual(before);
    expect(await context.cookies()).toEqual(cookiesBefore);
    expect(requestUrls).toEqual([]);
    expect(await readSessionSetting(page)).toBe('on');

    // No stored value anywhere contains the first row's header.
    const firstHeader =
      (await page.locator('summary.results__header').nth(0).textContent()) ?? '';
    expect(firstHeader).not.toBe('');
    for (const value of Object.values(after.session)) {
      expect(value).not.toContain(firstHeader);
    }
    for (const value of Object.values(after.local)) {
      expect(value).not.toContain(firstHeader);
    }
    expect(after.cookie).not.toContain(firstHeader);

    // Results exist only while the page is open.
    await page.reload();
    await waitForBanner(page);
    await openMenu(page);
    expect(await rowCount(page)).toBe(0);
    await expect(page.locator('p.results__empty')).toHaveText(NO_OUTPUT_YET);
  });
});
