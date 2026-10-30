import type { Page } from '@playwright/test';
import {
  expect,
  savedValue,
  seedSaved,
  SHOP_CONTAINER_ID,
  STORAGE_KEY,
  test,
  visitorContainerId,
} from './fixtures.ts';

/** Crafted addresses that carry a container ID; none may change the container. */
function craftedLinks(linkId: string): string[] {
  return [
    `/?gtm=${linkId}`,
    `/?id=${linkId}`,
    `/?gtm_id=${linkId}`,
    `/#${linkId}`,
    `/product/?gtm=${linkId}&scenario=missing-value`,
    `/basket/?container=${encodeURIComponent(linkId)}#gtm=${linkId}`,
    `/${linkId}/`,
  ];
}

async function readStored(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

test.describe('the address never chooses the container (SC-004, FR-013)', () => {
  test('no saved ID: crafted links never change the container', async ({ page, gtm }) => {
    const linkId = visitorContainerId('LINK01');
    const crafted = craftedLinks(linkId);
    expect(crafted.length).toBeGreaterThanOrEqual(5);

    for (const path of crafted) {
      gtm.reset();
      await page.goto(path);
      if (path === `/${linkId}/`) {
        // The path form may 404 under vite preview: only assert the link ID was
        // never requested and storage is unchanged.
        await page.waitForTimeout(100);
        expect(gtm.ids).not.toContain(linkId);
      } else {
        await expect.poll(() => gtm.ids.length).toBe(1);
        await page.waitForTimeout(100);
        expect(gtm.ids).toEqual([SHOP_CONTAINER_ID]);
        await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
      }
      expect(await readStored(page)).toBeNull();
      expect(gtm.external).toEqual([]);
    }
  });

  test('saved ID: crafted links never change the container or the stored value', async ({
    page,
    gtm,
  }) => {
    const linkId = visitorContainerId('LINK01');
    const visitor = visitorContainerId();
    const crafted = craftedLinks(linkId);
    expect(crafted.length).toBeGreaterThanOrEqual(5);

    await seedSaved(page, gtm, savedValue(visitor, Date.now()));
    const storedBefore = await readStored(page);
    expect(storedBefore).not.toBeNull();

    for (const path of crafted) {
      gtm.reset();
      await page.goto(path);
      if (path === `/${linkId}/`) {
        await page.waitForTimeout(100);
        expect(gtm.ids).not.toContain(linkId);
      } else {
        await expect.poll(() => gtm.ids.length).toBe(1);
        await page.waitForTimeout(100);
        expect(gtm.ids).toEqual([visitor]);
        await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
      }
      expect(await readStored(page)).toBe(storedBefore);
      expect(gtm.external).toEqual([]);
    }
  });

  test('a scenario link still sets the scenario switcher', async ({ page, gtm }) => {
    const linkId = visitorContainerId('LINK01');
    gtm.reset();
    await page.goto(`/product/?gtm=${linkId}&scenario=missing-value`);
    await expect.poll(() => gtm.ids.length).toBe(1);
    expect(gtm.ids).toEqual([SHOP_CONTAINER_ID]);
    await expect(page.locator('#scenario-select')).toHaveValue('missing-value');
    expect(gtm.external).toEqual([]);
  });
});
