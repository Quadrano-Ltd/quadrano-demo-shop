import { expect, openMenu, pushedEntries, test } from './fixtures.ts';

/**
 * The hero item as written in the push contract
 * (`kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`), not imported
 * from `site/src/datalayer/*` (that would make the check tautological).
 */
const HERO_ITEM = {
  item_id: 'SKU-1001',
  item_name: 'Stoneware Mug',
  price: 12.99,
  quantity: 1,
} as const;

interface PushedEvent {
  readonly event: string;
  readonly ecommerce: Record<string, unknown>;
}

const ADD_TO_CART_EVENT = {
  event: 'add_to_cart',
  ecommerce: {
    currency: 'GBP',
    value: 12.99,
    items: [HERO_ITEM],
  },
};

function purchaseCorrect(transactionId: string): Record<string, unknown> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'GBP',
      value: 12.99,
      items: [HERO_ITEM],
    },
  };
}

function purchaseMissingValue(transactionId: string): Record<string, unknown> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'GBP',
      items: [HERO_ITEM],
    },
  };
}

function purchaseValueAsText(transactionId: string): Record<string, unknown> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'GBP',
      value: '12.99',
      items: [HERO_ITEM],
    },
  };
}

function purchaseWrongCaseKey(transactionId: string): Record<string, unknown> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_ID: transactionId,
      currency: 'GBP',
      value: 12.99,
      items: [HERO_ITEM],
    },
  };
}

function purchaseLowercaseCurrency(transactionId: string): Record<string, unknown> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'gbp',
      value: 12.99,
      items: [HERO_ITEM],
    },
  };
}

function purchaseBadTransactionId(): Record<string, unknown> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: '12345',
      currency: 'GBP',
      value: 12.99,
      items: [HERO_ITEM],
    },
  };
}

/** Reads a random transaction id off the pushed event and asserts its pattern. */
function transactionIdFrom(
  pushed: PushedEvent,
  key: 'transaction_id' | 'transaction_ID' = 'transaction_id',
): string {
  const id = pushed.ecommerce[key] as string;
  expect(id).toMatch(/^T-\d{6}$/);
  return id;
}

interface PlaygroundButton {
  readonly label: string;
  readonly expected: (pushed: PushedEvent) => Record<string, unknown>;
}

const PLAYGROUND_BUTTONS: readonly PlaygroundButton[] = [
  { label: 'add_to_cart', expected: () => ADD_TO_CART_EVENT },
  {
    label: 'purchase · Correct',
    expected: (pushed) => purchaseCorrect(transactionIdFrom(pushed)),
  },
  {
    label: 'purchase · 1 · Missing value',
    expected: (pushed) => purchaseMissingValue(transactionIdFrom(pushed)),
  },
  {
    label: 'purchase · 2 · Value as text',
    expected: (pushed) => purchaseValueAsText(transactionIdFrom(pushed)),
  },
  {
    label: 'purchase · 3 · Wrong-case key',
    expected: (pushed) => purchaseWrongCaseKey(transactionIdFrom(pushed, 'transaction_ID')),
  },
  {
    label: 'purchase · 4 · Lower-case currency',
    expected: (pushed) => purchaseLowercaseCurrency(transactionIdFrom(pushed)),
  },
  {
    label: 'purchase · Spare · Bad transaction ID',
    expected: () => purchaseBadTransactionId(),
  },
];

const LIVE_REGION = '[role="status"][aria-live="polite"]';

const SCENARIO_IDS = [
  'correct',
  'missing-value',
  'value-as-text',
  'wrong-case-key',
  'lowercase-currency',
  'bad-transaction-id',
] as const;

test('the playground has exactly 7 buttons in the contract order', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);

  const buttons = page.locator('.visitor-menu__playground button');
  await expect(buttons).toHaveCount(7);
  expect(await buttons.allTextContents()).toEqual(
    PLAYGROUND_BUTTONS.map((entry) => entry.label),
  );
});

for (const path of ['/', '/basket/'] as const) {
  test(`each playground button pushes its contract shape in 2 interactions (${path})`, async ({
    page,
  }) => {
    await page.goto(path);

    for (const entry of PLAYGROUND_BUTTONS) {
      await openMenu(page);

      const button = page.getByRole('button', { name: entry.label });
      await expect(button).toBeVisible();

      const before = (await pushedEntries(page)).length;
      const urlBefore = page.url();
      const scenarioBefore = await page.locator('#scenario-select').inputValue();

      await button.click();

      const after = await pushedEntries(page);
      const added = after.slice(before);
      expect(added).toHaveLength(2);
      expect(added[0]).toEqual({ ecommerce: null });
      const pushed = added[1] as PushedEvent;
      expect(pushed).toEqual(entry.expected(pushed));

      await expect(page.locator(LIVE_REGION)).toContainText(`Pushed ${entry.label}`);

      expect(page.url()).toBe(urlBefore);
      await expect(page.locator('#scenario-select')).toHaveValue(scenarioBefore);

      // Close so the next button is again reached in exactly 2 interactions.
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.locator('#visitor-menu')).toBeHidden();
    }
  });
}

test('pressing the same button twice adds exactly 4 entries', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);

  const button = page.getByRole('button', { name: 'add_to_cart' });
  const before = (await pushedEntries(page)).length;

  await button.click();
  await button.click();

  const after = await pushedEntries(page);
  expect(after.length - before).toBe(4);
});

test('?scenario= links set the switcher and nav links carry the scenario (SC-006)', async ({
  page,
}) => {
  for (const id of SCENARIO_IDS) {
    await page.goto(`/?scenario=${id}`);
    await expect(page.locator('#scenario-select')).toHaveValue(id);
    expect(await pushedEntries(page)).toHaveLength(0);

    const links = page.locator('a[href^="/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      await expect(links.nth(index)).toHaveAttribute(
        'href',
        new RegExp(`[?&]scenario=${id}(?:&|$)`),
      );
    }
  }
});
