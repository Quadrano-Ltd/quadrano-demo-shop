import type { Page } from '@playwright/test';
import {
  expect,
  openMenu,
  PAGES,
  savedValue,
  seedSaved,
  test,
  visitorContainerId,
} from './fixtures.ts';
import {
  PLAYGROUND_LABELS,
  openWithResults,
  rowCount,
  serveSnippetAsGtm,
  waitForBanner,
} from './results-helpers.ts';

test.use({ viewport: { width: 360, height: 740 } });

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function intersects(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

async function requireBox(page: Page, selector: string): Promise<Box> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) {
    throw new Error(`Expected ${selector} to have a bounding box`);
  }
  return box;
}

for (const path of PAGES) {
  for (const banner of [false, true]) {
    for (const menuOpen of [false, true]) {
      test(
        `no horizontal overflow ${path} banner=${banner} menu=${menuOpen ? 'open' : 'closed'}`,
        async ({ page, gtm }) => {
          if (banner) {
            await seedSaved(page, gtm, savedValue(visitorContainerId('L360'), Date.now()));
          }
          await page.goto(path);
          if (menuOpen) {
            await openMenu(page);
          }
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
        },
      );
    }
  }
}

test('menu panel fits horizontally at 360px and last playground button is reachable', async ({
  page,
}) => {
  await page.goto('/');
  await openMenu(page);
  const panel = await requireBox(page, '#visitor-menu');
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(360);
  const last = page.locator('.playground__button').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test('toggle is at least 44 x 44 px', async ({ page }) => {
  await page.goto('/');
  const toggle = await requireBox(page, '.visitor-menu__toggle');
  expect(toggle.width).toBeGreaterThanOrEqual(44);
  expect(toggle.height).toBeGreaterThanOrEqual(44);
});

for (const path of PAGES) {
  test(`toggle does not cover the footer text on ${path} at 360px`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const toggle = await requireBox(page, '.visitor-menu__toggle');
    const footer = await requireBox(page, '.site-footer p');
    expect(intersects(toggle, footer)).toBe(false);
  });
}

test('toggle does not cover the Place order button on /checkout/ at 360px', async ({ page }) => {
  await page.goto('/checkout/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const toggle = await requireBox(page, '.visitor-menu__toggle');
  const place = await requireBox(page, '.checkout__place');
  expect(intersects(toggle, place)).toBe(false);
});

/** Load `path` with the view on and 5 results, then expand the first 2 rows. */
async function withFiveResults(page: Page, path: string): Promise<void> {
  await serveSnippetAsGtm(page);
  await openWithResults(page, path);
  await waitForBanner(page);
  await openMenu(page);
  for (const [index, label] of PLAYGROUND_LABELS.entries()) {
    if (index >= 5) break;
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('li.results__row')).toHaveCount(index + 1);
  }
  await page.locator('summary.results__header').nth(0).click();
  await page.locator('summary.results__header').nth(1).click();
  await expect(page.locator('details.results__result').nth(0)).toHaveAttribute(
    'open',
    '',
  );
  await expect(page.locator('details.results__result').nth(1)).toHaveAttribute(
    'open',
    '',
  );
  expect(await rowCount(page)).toBe(5);
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

for (const path of PAGES) {
  test(`no horizontal overflow ${path} with the Results view on and 5 results`, async ({
    page,
  }) => {
    await withFiveResults(page, path);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
}

test('menu panel itself does not scroll sideways with the Results view on', async ({
  page,
}) => {
  await withFiveResults(page, '/');
  const widths = await page.evaluate(() => {
    const panel = document.querySelector('#visitor-menu');
    if (panel === null) return null;
    return { scroll: panel.scrollWidth, client: panel.clientWidth };
  });
  expect(widths).not.toBeNull();
  expect(widths?.scroll).toBeLessThanOrEqual(widths?.client ?? 0);
});

test('very long text wraps and neither page nor panel overflows', async ({
  page,
}) => {
  await openWithResults(page);
  await page.evaluate((marker) => {
    const text = marker.repeat(400);
    console.groupCollapsed('%c?%c %s', '', '', text);
    console.log(text);
    console.log('Pushed:', { line: text });
    console.groupEnd();
  }, '?');
  await openMenu(page);

  const header = await page.locator('summary.results__header').nth(0).textContent();
  const line = await page.locator('p.results__line').nth(0).textContent();
  const pushed = await page.locator('pre.results__pushed').nth(0).textContent();
  expect(header).toBe(`? ${'?'.repeat(400)}`);
  expect(line).toHaveLength(400);
  expect(pushed).toContain('?'.repeat(400));

  await page.locator('summary.results__header').nth(0).click();
  await expect(page.locator('details.results__result').nth(0)).toHaveAttribute(
    'open',
    '',
  );

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  const widths = await page.evaluate(() => {
    const panel = document.querySelector('#visitor-menu');
    if (panel === null) return null;
    return { scroll: panel.scrollWidth, client: panel.clientWidth };
  });
  expect(widths?.scroll).toBeLessThanOrEqual(widths?.client ?? 0);
});

test('empty state wraps at 360px with no horizontal overflow', async ({ page }) => {
  await openWithResults(page);
  await openMenu(page);
  await expect(page.locator('p.results__empty')).toHaveText(
    "Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.",
  );
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test('last Results row is reachable at 360px with 5 results', async ({ page }) => {
  await withFiveResults(page, '/');
  const last = page.locator('summary.results__header').nth(4);
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});
