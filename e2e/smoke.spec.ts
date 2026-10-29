import { SHOP_CONTAINER_ID, expect, test } from './fixtures.ts';

test('smoke: one container, no external requests', async ({ page, gtm }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
  expect(gtm.ids).toEqual([SHOP_CONTAINER_ID]);
  expect(gtm.external).toEqual([]);
});
