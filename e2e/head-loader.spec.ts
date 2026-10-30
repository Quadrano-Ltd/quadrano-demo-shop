import type { Page } from '@playwright/test';
import {
  PAGES,
  SHOP_CONTAINER_ID,
  STORAGE_KEY,
  expect,
  savedValue,
  seedSaved,
  test,
  visitorContainerId,
} from './fixtures.ts';

const BASE_ORIGIN = 'http://127.0.0.1:4173';

/** Event names in `window.dataLayer`, in push order (entries without one are `null`). */
async function eventOrder(page: Page): Promise<(string | null)[]> {
  return page.evaluate(() =>
    (Array.isArray(window.dataLayer) ? window.dataLayer : []).map((entry) => {
      const event = (entry as { event?: unknown } | null)?.event;
      return typeof event === 'string' ? event : null;
    }),
  );
}

/** Product → basket → checkout → Place order, ending on the thank-you page. */
async function placeOrder(page: Page): Promise<void> {
  await page.goto('/product/?id=SKU-1001');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await page.goto('/checkout/');
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL('**/thank-you/**');
  await page.waitForLoadState('load');
}

test.describe('the container is chosen before the first push (FR-002)', () => {
  test('shop state: gtm.js precedes the thank-you page purchase push', async ({ page }) => {
    await placeOrder(page);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');

    const events = await eventOrder(page);
    const gtmStart = events.indexOf('gtm.js');
    const purchase = events.indexOf('purchase');
    expect(gtmStart).toBe(0);
    expect(purchase).toBeGreaterThan(gtmStart);
  });

  test('visitor state: gtm.js precedes the thank-you page purchase push', async ({
    page,
    gtm,
  }) => {
    const visitor = visitorContainerId('ORDER01');
    await seedSaved(page, gtm, savedValue(visitor, Date.now()));
    await placeOrder(page);
    await expect(page.locator('html')).toHaveAttribute('data-visitor-container', visitor);

    const events = await eventOrder(page);
    const gtmStart = events.indexOf('gtm.js');
    const purchase = events.indexOf('purchase');
    expect(gtmStart).toBe(0);
    expect(purchase).toBeGreaterThan(gtmStart);
    expect(gtm.ids.at(-1)).toBe(visitor);
  });
});

test.describe('no-script fallback loads only the shop container (FR-004)', () => {
  test.use({ javaScriptEnabled: false });

  test('no saved ID: each page carries the shop iframe and requests no gtm.js', async ({
    page,
    gtm,
  }) => {
    for (const path of PAGES) {
      gtm.reset();
      await page.goto(path);
      await expect(
        page.locator(`iframe[src="https://www.googletagmanager.com/ns.html?id=${SHOP_CONTAINER_ID}"]`),
      ).toHaveCount(1);
      expect(gtm.ids).toEqual([]);
    }
  });

  test.describe('with a saved visitor ID', () => {
    const visitor = visitorContainerId('NOJS01');
    test.use({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: BASE_ORIGIN,
            localStorage: [{ name: STORAGE_KEY, value: savedValue(visitor, Date.now()) }],
          },
        ],
      },
    });

    test('the saved ID never reaches the no-script iframe', async ({ page, gtm }) => {
      for (const path of PAGES) {
        gtm.reset();
        await page.goto(path);
        await expect(page.locator('iframe[src*="ns.html"]')).toHaveCount(1);
        await expect(page.locator(`iframe[src*="${visitor}"]`)).toHaveCount(0);
        expect(gtm.ids).toEqual([]);
      }
    });
  });
});
