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
import {
  PLAYGROUND_LABELS as WP05_PLAYGROUND_LABELS,
  openWithResults,
  rowCount,
  serveSnippetAsGtm,
  waitForBanner,
} from './results-helpers.ts';

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

test.describe('axe with the Results view on', () => {
  for (const path of PAGES) {
    test(`axe ${path} results view on, empty, Quadrano not loaded`, async ({
      page,
    }) => {
      await openWithResults(page, path);
      await openMenu(page);
      await expect(page.locator('p.results__empty')).toHaveText(
        "Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.",
      );
      expect(await rowCount(page)).toBe(0);
      await expectNoViolations(page);
    });

    test(`axe ${path} results view on, empty, Quadrano loaded`, async ({
      page,
    }) => {
      await serveSnippetAsGtm(page);
      await openWithResults(page, path);
      await waitForBanner(page);
      await openMenu(page);
      await expect(page.locator('p.results__empty')).toHaveText('No output yet');
      expect(await rowCount(page)).toBe(0);
      await expectNoViolations(page);
    });

    test(`axe ${path} results view on, with results`, async ({ page }) => {
      await serveSnippetAsGtm(page);
      await openWithResults(page, path);
      await waitForBanner(page);
      await openMenu(page);

      for (const [index, label] of WP05_PLAYGROUND_LABELS.entries()) {
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
      await expectNoViolations(page);
    });
  }

  test('axe / results view off, menu open', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    const section = page.locator('section.results');
    await expect(section).toBeVisible();
    await expect(section.locator('p.results__empty')).toHaveCount(0);
    await expect(section.locator('ul.results__list')).toHaveCount(0);
    await expect(section.locator('#results-switch')).toBeVisible();
    await expect(section.locator('#results-switch')).not.toBeChecked();
    await expectNoViolations(page);
  });

  test('axe / results view off, sessionStorage blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    await openMenu(page);
    await expect(page.locator('#results-switch')).toBeDisabled();
    await expect(page.locator('#results-switch-note')).toHaveText(
      "This browser blocks site storage, so this view can't be remembered. Open the shop from the talk's link to see it on one page.",
    );
    await expectNoViolations(page);
  });
});

test('keyboard: the switch and every Results row are reached and operated', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  const pressed = [
    'add_to_cart',
    'purchase · Correct',
    'purchase · 1 · Missing value',
  ];
  for (const [index, label] of pressed.entries()) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('li.results__row')).toHaveCount(index + 1);
  }

  const switchElement = page.locator('#results-switch');

  // Tab from the panel heading until the Results switch is focused.
  for (let tab = 0; tab < 60; tab += 1) {
    const onSwitch = await page.evaluate(
      () => document.activeElement?.id === 'results-switch',
    );
    if (onSwitch) break;
    await page.keyboard.press('Tab');
  }
  await expect(switchElement).toBeFocused();
  const switchFocusStyle = await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) {
      return { outline: 'none', shadow: 'none' };
    }
    const style = getComputedStyle(el);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(
    switchFocusStyle.outline !== 'none' || switchFocusStyle.shadow !== 'none',
  ).toBe(true);

  // Keep tabbing: each summary receives focus in list order (newest first).
  const headers = page.locator('summary.results__header');
  const focusedHeaders: string[] = [];
  for (let tab = 0; tab < 60; tab += 1) {
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      return el instanceof HTMLElement && el.classList.contains('results__header')
        ? (el.textContent ?? '')
        : null;
    });
    if (active !== null) {
      focusedHeaders.push(active);
      if (focusedHeaders.length === 3) break;
    }
    await page.keyboard.press('Tab');
  }
  await expect(headers.nth(0)).toHaveText(mustText(focusedHeaders[0]));
  await expect(headers.nth(1)).toHaveText(mustText(focusedHeaders[1]));
  await expect(headers.nth(2)).toHaveText(mustText(focusedHeaders[2]));

  // Enter opens the focused row; Space closes it; the others don't change.
  await headers.nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details.results__result').nth(0)).toHaveAttribute(
    'open',
    '',
  );
  await page.keyboard.press('Space');
  await expect(page.locator('details.results__result').nth(0)).not.toHaveAttribute(
    'open',
    '',
  );

  await headers.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details.results__result').nth(1)).toHaveAttribute(
    'open',
    '',
  );
  await page.keyboard.press('Space');
  await expect(page.locator('details.results__result').nth(1)).not.toHaveAttribute(
    'open',
    '',
  );
  await expect(page.locator('details.results__result').nth(0)).not.toHaveAttribute(
    'open',
    '',
  );
  await expect(page.locator('details.results__result').nth(2)).not.toHaveAttribute(
    'open',
    '',
  );

  // Escape from a focused summary closes the menu and returns focus to the toggle.
  await headers.nth(0).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#visitor-menu')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Demo menu' })).toBeFocused();
});

test('keyboard: the switch turns the view on and off by Space alone', async ({
  page,
}) => {
  await page.goto('/');
  await openMenu(page);

  await page.locator('#results-switch').focus();
  await expect(page.locator('#results-switch')).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');

  // The reload closed the menu; open it again and turn the view back off.
  await openMenu(page);
  await page.locator('#results-switch').focus();
  await expect(page.locator('#results-switch')).toBeChecked();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).not.toHaveAttribute('data-results-view', 'on');
});

test('7 of 7 presses: the status region holds each new header and focus stays', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  for (const [index, label] of WP05_PLAYGROUND_LABELS.entries()) {
    const button = page.getByRole('button', { name: label, exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('li.results__row')).toHaveCount(index + 1);

    const header = await page
      .locator('summary.results__header')
      .nth(0)
      .textContent();
    await expect(page.locator('#results-status')).toHaveText(mustText(header));

    const focused = await page.evaluate(
      () => document.activeElement?.textContent?.trim(),
    );
    expect(focused).toBe(label);
  }
});

test('the Results status region sits in the menu host, outside the panel', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);

  const status = page.locator('#results-status');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveCount(1);

  const insideHost = await page
    .locator('.visitor-menu-host #results-status')
    .count();
  expect(insideHost).toBe(1);
  const insidePanel = await page.locator('#visitor-menu #results-status').count();
  expect(insidePanel).toBe(0);
});

test('announced with the menu closed and focus stays on Add to basket', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page, '/product/');
  await waitForBanner(page);

  const add = page.getByRole('button', { name: 'Add to basket' });
  await add.focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#results-status')).not.toHaveText('');
  await expect(add).toBeFocused();
});

test('the layout live region and the Results status hold their own messages', async ({
  page,
}) => {
  await serveSnippetAsGtm(page);
  await openWithResults(page);
  await waitForBanner(page);
  await openMenu(page);

  await page
    .getByRole('button', { name: 'add_to_cart', exact: true })
    .click();
  await expect(page.locator('li.results__row')).toHaveCount(1);

  await expect(page.locator('#app > p.visually-hidden[role="status"]')).toHaveText(
    'Pushed add_to_cart',
  );
  const header = await page.locator('summary.results__header').nth(0).textContent();
  await expect(page.locator('#results-status')).toHaveText(mustText(header));
});

function mustText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    throw new Error('missing text');
  }
  return value;
}
