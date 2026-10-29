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
