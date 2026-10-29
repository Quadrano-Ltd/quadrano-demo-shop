import type { Page } from '@playwright/test';
import {
  blockStorage,
  expect,
  LIFETIME_MS,
  openMenu,
  PAGES,
  savedValue,
  seedSaved,
  SHOP_CONTAINER_ID,
  STORAGE_KEY,
  test,
  visitorContainerId,
} from './fixtures.ts';

/** Wait for exactly one recorded `gtm.js` request and confirm it stays one. */
async function expectExactlyOne(
  page: Page,
  gtm: { readonly ids: string[] },
  expected: string,
): Promise<void> {
  await expect.poll(() => gtm.ids.length).toBe(1);
  await page.waitForTimeout(100);
  expect(gtm.ids).toEqual([expected]);
}

async function readStored(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

test.describe('one container per page (NFR-001)', () => {
  test('no saved ID: the shop container loads once per page (SC-001)', async ({ page, gtm }) => {
    for (const path of PAGES) {
      gtm.reset();
      await page.goto(path);
      await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
      await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
      await expect(page.locator('.visitor-banner')).toHaveCount(0);
      expect(gtm.external).toEqual([]);
    }
  });

  test('saved ID: the visitor container loads once per page (SC-002)', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor, Date.now()));
    for (const path of PAGES) {
      gtm.reset();
      await page.goto(path);
      await expectExactlyOne(page, gtm, visitor);
      await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
      await expect(page.locator('html')).toHaveAttribute('data-visitor-container', visitor);
      await expect(page.locator('.visitor-banner')).toContainText(visitor);
      expect(gtm.external).toEqual([]);
    }
  });

  test('the visitor entering the shop ID keeps one request with a visitor source', async ({
    page,
    gtm,
  }) => {
    await seedSaved(page, gtm, savedValue(SHOP_CONTAINER_ID, Date.now()));
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
    await expect(page.locator('html')).toHaveAttribute(
      'data-visitor-container',
      SHOP_CONTAINER_ID,
    );
    expect(gtm.external).toEqual([]);
  });
});

test.describe('saved-value handling (FR-011, FR-012)', () => {
  test('an expired saved value loads the shop and is removed', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    const expired = savedValue(visitor, Date.now() - LIFETIME_MS - 1000);
    for (const path of ['/', '/product/']) {
      await seedSaved(page, gtm, expired);
      gtm.reset();
      await page.goto(path);
      await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
      await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
      expect(await readStored(page)).toBeNull();
      expect(gtm.external).toEqual([]);
    }
  });

  test('a value just under 24 h still loads the visitor container', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor, Date.now() - LIFETIME_MS + 60_000));
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, visitor);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
    expect(gtm.external).toEqual([]);
  });

  test('a future-dated saved value loads the shop and is removed', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor, Date.now() + 60_000));
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    expect(await readStored(page)).toBeNull();
    expect(gtm.external).toEqual([]);
  });

  test('a junk saved value loads the shop and is removed', async ({ page, gtm }) => {
    await seedSaved(page, gtm, 'junk');
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    expect(await readStored(page)).toBeNull();
    expect(gtm.external).toEqual([]);
  });

  test('a lower-case saved ID loads the shop and is removed', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor.toLowerCase(), Date.now()));
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    expect(await readStored(page)).toBeNull();
    expect(gtm.external).toEqual([]);
  });

  test('a saved value with an extra key loads the shop and is removed', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, JSON.stringify({ id: visitor, savedAt: Date.now(), x: 1 }));
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    expect(await readStored(page)).toBeNull();
    expect(gtm.external).toEqual([]);
  });

  test('a throwing localStorage loads the shop and disables the menu', async ({ page, gtm }) => {
    await blockStorage(page);
    gtm.reset();
    await page.goto('/');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    await expect(page.locator('html')).toHaveAttribute('data-storage', 'unavailable');
    await openMenu(page);
    await expect(page.locator('.visitor-menu__note')).toContainText(
      "isn't available in this browser",
    );
    await expect(page.locator('#visitor-container-id')).toBeDisabled();
    expect(gtm.external).toEqual([]);
  });
});

test.describe('reset restores the shop container (FR-010)', () => {
  test('the banner reset returns to the shop container', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor, Date.now()));
    gtm.reset();
    await page.goto('/product/');
    await expectExactlyOne(page, gtm, visitor);

    gtm.reset();
    await page.locator('.visitor-banner__reset').click();
    await page.waitForLoadState('load');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    await expect(page.locator('.visitor-banner')).toHaveCount(0);
    expect(await readStored(page)).toBeNull();
    expect(gtm.external).toEqual([]);
  });

  test('the menu path-1 button resets to the shop container', async ({ page, gtm }) => {
    const visitor = visitorContainerId();
    await seedSaved(page, gtm, savedValue(visitor, Date.now()));
    gtm.reset();
    await page.goto('/product/');
    await expectExactlyOne(page, gtm, visitor);

    await openMenu(page);
    gtm.reset();
    await page
      .getByRole('button', { name: 'Show me the output with the pre-built container' })
      .click();
    await page.waitForLoadState('load');
    await expectExactlyOne(page, gtm, SHOP_CONTAINER_ID);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
    await expect(page.locator('.visitor-banner')).toHaveCount(0);
    expect(await readStored(page)).toBeNull();
    expect(gtm.external).toEqual([]);
  });
});
