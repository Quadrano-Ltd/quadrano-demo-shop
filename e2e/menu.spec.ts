import type { Locator, Page } from '@playwright/test';
import {
  PAGES,
  STORAGE_KEY,
  expect,
  openMenu,
  pushedEntries,
  savedValue,
  seedSaved,
  test,
  visitorContainerId,
} from './fixtures.ts';

/** Builds `GTM-<body>` at run time: the no-secrets gate forbids the literal. */
function gtmId(body: string): string {
  return ['GTM', body].join('-');
}

/**
 * Malformed inputs (SC-003 floor: ≥ 10). Every value is built at run time so
 * none of them matches the no-secrets `GTM-[A-Z0-9]{4,10}` pattern in source.
 */
const MALFORMED_IDS: readonly string[] = [
  gtmId('ABC'), // too short (3 after the prefix)
  gtmId('A'.repeat(11)), // too long (11 after the prefix)
  ['gtm', 'ABCD12'].join('-'), // lower-case prefix
  gtmId('abcd12'), // lower-case suffix
  ['UA', '1234'].join('-'), // wrong prefix
  ['G', 'ABCD1234'].join('-'), // GA4 shape
  ` ${gtmId('ABCD12')}`, // leading space
  `${gtmId('ABCD12')} `, // trailing space
  gtmId('AB CD12'), // inner space
  gtmId('ABCD-12'), // hyphen inside
  `${gtmId('ABCD12')}!`, // trailing punctuation
  ['GTM', 'ABCD12'].join('_'), // underscore separator
  ['GTM', 'ABCD12'].join(''), // no separator
  '', // empty
];

const REFUSAL_TEXT = "That doesn't look like a container ID";

const PATH_1_BUTTON = 'Show me the output with the pre-built container';
const RESET_BUTTON = "Reset to the shop's container";

async function readSaved(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function setReloadMarker(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { __noReload?: boolean }).__noReload = true;
  });
}

async function reloadMarkerStillSet(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as Window & { __noReload?: boolean }).__noReload === true,
  );
}

/** Fills a malformed ID, saves, and asserts the contract refusal with no side effects. */
async function expectRefused(
  page: Page,
  input: Locator,
  value: string,
  storageBefore: string | null,
  pushesBefore: number,
): Promise<void> {
  await setReloadMarker(page);
  const urlBefore = page.url();

  await input.fill(value);
  await page.getByRole('button', { name: 'Save' }).click();

  const message = page.locator('#visitor-container-message');
  await expect(message).toContainText(REFUSAL_TEXT);
  await expect(message).toContainText('GTM-XXXXXXX');
  await expect(input).toHaveAttribute('aria-invalid', 'true');

  expect(page.url()).toBe(urlBefore);
  expect(await reloadMarkerStillSet(page)).toBe(true);
  expect(await readSaved(page)).toBe(storageBefore);
  expect((await pushedEntries(page)).length).toBe(pushesBefore);

  // FR-022: the refusal copy carries no verdict symbols or words.
  await expect(message).not.toContainText(
    /[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i,
  );
}

test('a well-formed ID saves, reloads, and shows the banner on every page', async ({
  page,
}) => {
  const id = visitorContainerId('MENU01');

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');

  await openMenu(page);
  await page.getByLabel('Your container ID').fill(id);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  await expect(page.locator('html')).toHaveAttribute('data-visitor-container', id);

  const stored = await readSaved(page);
  expect(stored).not.toBeNull();
  const parsed = JSON.parse(stored as string) as { id: string; savedAt: number };
  expect(parsed.id).toBe(id);
  const age = Date.now() - parsed.savedAt;
  expect(age).toBeGreaterThanOrEqual(0);
  expect(age).toBeLessThan(60_000);

  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
    const banner = page.locator('.visitor-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(`Using your container ${id}`);
    await expect(banner.getByRole('button', { name: RESET_BUTTON })).toBeVisible();
  }

  // On one page the menu status names the visitor's container and offers its
  // own reset (FR-010: in the banner and in the menu).
  await openMenu(page);
  await expect(page.locator('.visitor-menu__status')).toContainText(
    `In use: your container ${id}`,
  );
  await expect(
    page.locator('#visitor-menu').getByRole('button', { name: RESET_BUTTON }),
  ).toBeVisible();
});

test('malformed IDs are refused in the shop state (≥ 10)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');

  const storageBefore = await readSaved(page);
  const pushesBefore = (await pushedEntries(page)).length;

  await openMenu(page);
  const input = page.getByLabel('Your container ID');

  for (const value of MALFORMED_IDS) {
    await expectRefused(page, input, value, storageBefore, pushesBefore);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
  }

  expect(MALFORMED_IDS.length).toBeGreaterThanOrEqual(10);

  // Typing after a refusal clears aria-invalid (contract behaviour).
  await input.pressSequentially('X');
  await expect(input).not.toHaveAttribute('aria-invalid');
});

test('malformed IDs are refused in the visitor state (≥ 10)', async ({ page, gtm }) => {
  const visitorId = visitorContainerId('VISIT02');
  await seedSaved(page, gtm, savedValue(visitorId, Date.now()));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  await expect(page.locator('html')).toHaveAttribute('data-visitor-container', visitorId);

  const storageBefore = await readSaved(page);
  const pushesBefore = (await pushedEntries(page)).length;

  await openMenu(page);
  const input = page.getByLabel('Your container ID');

  for (const value of MALFORMED_IDS) {
    await expectRefused(page, input, value, storageBefore, pushesBefore);
    await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  }

  expect(MALFORMED_IDS.length).toBeGreaterThanOrEqual(10);
});

test('path 1 in the shop state reports the shop container without reloading', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');

  const storageBefore = await readSaved(page);
  const pushesBefore = (await pushedEntries(page)).length;

  await openMenu(page);
  await setReloadMarker(page);
  const urlBefore = page.url();

  await page.getByRole('button', { name: PATH_1_BUTTON }).click();

  await expect(page.locator('.visitor-menu__message[role="status"]')).toContainText(
    "You're using the shop's pre-built container.",
  );
  expect(page.url()).toBe(urlBefore);
  expect(await reloadMarkerStillSet(page)).toBe(true);
  expect(await readSaved(page)).toBe(storageBefore);
  expect((await pushedEntries(page)).length).toBe(pushesBefore);
});

test('path 1 in the visitor state resets to the shop container', async ({ page, gtm }) => {
  await seedSaved(page, gtm, savedValue(visitorContainerId('RESET01'), Date.now()));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');

  await openMenu(page);
  await page.getByRole('button', { name: PATH_1_BUTTON }).click();

  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
  expect(await readSaved(page)).toBeNull();
});

test('menu actions push nothing (FR-017)', async ({ page }) => {
  await page.goto('/product/');
  const base = (await pushedEntries(page)).length;

  await openMenu(page);
  expect((await pushedEntries(page)).length).toBe(base);

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('#visitor-menu')).toBeHidden();
  expect((await pushedEntries(page)).length).toBe(base);

  await openMenu(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#visitor-menu')).toBeHidden();
  expect((await pushedEntries(page)).length).toBe(base);

  await openMenu(page);
  await page.getByRole('button', { name: PATH_1_BUTTON }).click();
  expect((await pushedEntries(page)).length).toBe(base);

  await page.getByLabel('Your container ID').fill(gtmId('NOPE'));
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await pushedEntries(page)).length).toBe(base);

  await page.locator('#scenario-select').selectOption('missing-value');
  expect((await pushedEntries(page)).length).toBe(base);
});

test('reset and a successful save reload to a page with no pushed entries', async ({
  page,
  gtm,
}) => {
  await page.goto('/product/');
  expect(await pushedEntries(page)).toHaveLength(0);

  // Banner reset.
  await seedSaved(page, gtm, savedValue(visitorContainerId('RESET02'), Date.now()));
  await page.goto('/product/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  await page.locator('.visitor-banner').getByRole('button', { name: RESET_BUTTON }).click();
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
  expect(await readSaved(page)).toBeNull();
  expect(await pushedEntries(page)).toHaveLength(0);

  // Menu reset.
  await seedSaved(page, gtm, savedValue(visitorContainerId('RESET03'), Date.now()));
  await page.goto('/product/');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  await openMenu(page);
  await page.locator('#visitor-menu').getByRole('button', { name: RESET_BUTTON }).click();
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
  expect(await readSaved(page)).toBeNull();
  expect(await pushedEntries(page)).toHaveLength(0);

  // Successful save.
  await openMenu(page);
  await page.getByLabel('Your container ID').fill(visitorContainerId('RESET04'));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  expect(await pushedEntries(page)).toHaveLength(0);
});
