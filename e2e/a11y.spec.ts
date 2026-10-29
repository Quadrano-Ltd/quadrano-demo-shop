import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  blockStorage,
  expect,
  openMenu,
  PAGES,
  pushedEntries,
  savedValue,
  seedSaved,
  test,
  visitorContainerId,
} from './fixtures.ts';

/** The tag set NFR-002's "0 violations" is measured against. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Accessible names of the 7 playground buttons, in DOM order (WP05/contract). */
const PLAYGROUND_LABELS = [
  'add_to_cart',
  'purchase · Correct',
  'purchase · 1 · Missing value',
  'purchase · 2 · Value as text',
  'purchase · 3 · Wrong-case key',
  'purchase · 4 · Lower-case currency',
  'purchase · Spare · Bad transaction ID',
] as const;

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe('axe matrix (WCAG A/AA)', () => {
  for (const path of PAGES) {
    for (const banner of [false, true]) {
      for (const menuOpen of [false, true]) {
        test(
          `axe ${path} banner=${banner} menu=${menuOpen ? 'open' : 'closed'}`,
          async ({ page, gtm }) => {
            if (banner) {
              await seedSaved(page, gtm, savedValue(visitorContainerId('A11Y01'), Date.now()));
            }
            await page.goto(path);
            if (menuOpen) {
              await openMenu(page);
              await expect(page.locator('#visitor-menu')).toBeVisible();
            } else {
              await expect(page.locator('#visitor-menu')).toBeHidden();
            }
            await expectNoViolations(page);
          },
        );
      }
    }
  }
});

test('axe / storage unavailable menu open', async ({ page }) => {
  await blockStorage(page);
  await page.goto('/');
  await openMenu(page);
  await expect(page.locator('#visitor-container-id')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  await expectNoViolations(page);
});

test('axe / refused save menu open', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  const input = page.locator('#visitor-container-id');
  await input.fill('gtm-abc123');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expectNoViolations(page);
});

test.describe('axe best-practice (non-failing, for the Product Owner)', () => {
  for (const path of PAGES) {
    test(`axe best-practice ${path}`, async ({ page }) => {
      await page.goto(path);
      await openMenu(page);
      const results = await new AxeBuilder({ page }).withTags(['best-practice']).analyze();
      const summary = {
        page: path,
        violations: results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          help: violation.helpUrl,
        })),
        incomplete: results.incomplete.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.length,
        })),
      };
      console.log(`[axe-best-practice] ${path} :: ${JSON.stringify(summary)}`);
      test.info().annotations.push({
        type: 'axe-best-practice',
        description: JSON.stringify(summary),
      });
    });
  }
});

test('keyboard: toggle, menu, banner and playground work by keyboard alone', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Demo menu' });
  const panel = page.locator('#visitor-menu');

  // 1. Tab from the top until the toggle is focused (capped to keep the test bounded).
  for (let press = 0; press < 60; press += 1) {
    const onToggle = await page.evaluate(() => {
      const el = document.activeElement;
      return el instanceof HTMLElement && el.classList.contains('visitor-menu__toggle');
    });
    if (onToggle) {
      break;
    }
    await page.keyboard.press('Tab');
  }
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-controls', 'visitor-menu');
  const focusStyle = await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) {
      return { outline: 'none', shadow: 'none' };
    }
    const style = getComputedStyle(el);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(focusStyle.outline !== 'none' || focusStyle.shadow !== 'none').toBe(true);

  // 2. Enter opens the panel and moves focus to the heading.
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#visitor-menu-title')).toBeFocused();

  // 3. Tab through every control inside the panel and collect what was reached.
  const names = new Set<string>();
  const ids = new Set<string>();
  for (let press = 0; press < 15; press += 1) {
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) {
        return { id: '', text: '' };
      }
      return { id: el.id, text: (el.textContent ?? '').trim() };
    });
    if (info.id !== '') {
      ids.add(info.id);
    }
    if (info.text !== '') {
      names.add(info.text);
    }
    await page.keyboard.press('Tab');
  }
  expect(names.has('Close')).toBe(true);
  expect(names.has('Show me the output with the pre-built container')).toBe(true);
  expect(names.has('Save')).toBe(true);
  expect(ids.has('visitor-container-id')).toBe(true);
  for (const label of PLAYGROUND_LABELS) {
    expect(names.has(label)).toBe(true);
  }

  // 4. Escape from inside the panel closes it and returns focus to the toggle.
  await page.locator('.playground__button').last().focus();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();

  // 5. Escape with focus on the toggle also closes the open panel.
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();

  // 6. Space on the toggle opens it (native button behaviour).
  await page.keyboard.press('Space');
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  // 7. Enter in the ID input submits the form, saves and reloads into visitor state.
  const savedId = visitorContainerId('KB01');
  const input = page.locator('#visitor-container-id');
  await input.focus();
  await page.keyboard.type(savedId);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'visitor');
  await expect(page.locator('html')).toHaveAttribute('data-visitor-container', savedId);
  await expect(page.locator('.visitor-banner')).toBeVisible();

  // 8. With the banner shown, Tab reaches the banner reset before the header links.
  const bannerReset = page.locator('.visitor-banner__reset');
  await page.keyboard.press('Tab');
  await expect(bannerReset).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
  await expect(page.locator('.visitor-banner')).toHaveCount(0);

  // 9. One playground button with Enter and one with Space: exactly 2 pushes each.
  await page.goto('/');
  await openMenu(page);
  const playgroundButtons = page.locator('.playground__button');
  await playgroundButtons.nth(0).focus();
  const beforeEnter = (await pushedEntries(page)).length;
  await page.keyboard.press('Enter');
  expect((await pushedEntries(page)).length - beforeEnter).toBe(2);

  await playgroundButtons.nth(1).focus();
  const beforeSpace = (await pushedEntries(page)).length;
  await page.keyboard.press('Space');
  expect((await pushedEntries(page)).length - beforeSpace).toBe(2);
});
