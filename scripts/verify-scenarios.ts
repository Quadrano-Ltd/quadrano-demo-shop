import assert from 'node:assert/strict';
import {
  buildAddToCart,
  buildPurchase,
  newTransactionId,
  TRANSACTION_ID_PATTERN,
} from '../site/src/datalayer/events.ts';
import type { PushLine } from '../site/src/datalayer/events.ts';
import { getScenario, SCENARIO_IDS, SCENARIOS } from '../site/src/datalayer/scenarios.ts';

/**
 * `pnpm verify:scenarios` — the FR-012 developer check (not a gate).
 *
 * Prints one line per check with its name and the word `ok`, or `not ok` with a
 * clear message, and exits non-zero on any failure.
 */

const VERDICT_PATTERN =
  /[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i;

const HERO_LINE: PushLine = {
  itemId: 'SKU-1001',
  name: 'Stoneware Mug',
  pricePence: 1299,
  quantity: 1,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => deepEquals(value, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every((key) => key in b && deepEquals(a[key], b[key]));
  }
  return false;
}

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  Object.freeze(value);
}

/**
 * Deep diff between two plain-object trees, expressed as `removed`, `added` and
 * `changed` entries at dotted paths. Arrays are compared structurally.
 */
function diff(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    for (const key of keysA) {
      if (!(key in b)) {
        out.push(`removed ${path}${key}`);
      }
    }
    for (const key of keysB) {
      if (!(key in a)) {
        out.push(`added ${path}${key}`);
      }
    }
    for (const key of keysA) {
      if (!(key in b)) {
        continue;
      }
      const va = a[key];
      const vb = b[key];
      if (isPlainObject(va) && isPlainObject(vb)) {
        diff(va, vb, `${path}${key}.`, out);
      } else if (!deepEquals(va, vb)) {
        const typeSuffix = typeof va === typeof vb ? '' : ` (${typeof vb})`;
        out.push(`changed ${path}${key} → ${JSON.stringify(vb)}${typeSuffix}`);
      }
    }
    return out;
  }
  if (!deepEquals(a, b)) {
    out.push(`changed ${path} → ${JSON.stringify(b)} (${typeof b})`);
  }
  return out;
}

const checks: ReadonlyArray<readonly [string, () => void]> = [
  [
    'order and ids',
    () => {
      assert.deepStrictEqual(
        SCENARIOS.map((scenario) => scenario.id),
        [...SCENARIO_IDS],
      );
      assert.deepStrictEqual(
        SCENARIOS.filter((scenario) => !scenario.talkScript).map(
          (scenario) => scenario.id,
        ),
        ['bad-transaction-id'],
      );
      const expectedLabels: Record<string, string> = {
        correct: 'Correct',
        'missing-value': '1 · Missing value',
        'value-as-text': '2 · Value as text',
        'wrong-case-key': '3 · Wrong-case key',
        'lowercase-currency': '4 · Lower-case currency',
        'bad-transaction-id': 'Spare · Bad transaction ID',
      };
      for (const scenario of SCENARIOS) {
        assert.strictEqual(scenario.label, expectedLabels[scenario.id]);
      }
    },
  ],
  [
    'labels carry no verdict wording',
    () => {
      for (const scenario of SCENARIOS) {
        assert.doesNotMatch(scenario.label, VERDICT_PATTERN);
      }
    },
  ],
  [
    'correct objects match the contract',
    () => {
      assert.deepStrictEqual(buildAddToCart(HERO_LINE), {
        event: 'add_to_cart',
        ecommerce: {
          currency: 'GBP',
          value: 12.99,
          items: [
            {
              item_id: 'SKU-1001',
              item_name: 'Stoneware Mug',
              price: 12.99,
              quantity: 1,
            },
          ],
        },
      });
      assert.deepStrictEqual(
        buildPurchase({ transactionId: 'T-104233', lines: [HERO_LINE] }),
        {
          event: 'purchase',
          ecommerce: {
            transaction_id: 'T-104233',
            currency: 'GBP',
            value: 12.99,
            items: [
              {
                item_id: 'SKU-1001',
                item_name: 'Stoneware Mug',
                price: 12.99,
                quantity: 1,
              },
            ],
          },
        },
      );
    },
  ],
  [
    'value arithmetic',
    () => {
      const baskets: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
        [[1299, 1]],
        [
          [1299, 2],
          [850, 3],
        ],
        [
          [2400, 1],
          [1575, 3],
          [1299, 1],
        ],
      ];
      for (const basket of baskets) {
        const lines: PushLine[] = basket.map(([pricePence, quantity], index) => ({
          itemId: `SKU-${index}`,
          name: `Item ${index}`,
          pricePence,
          quantity,
        }));
        const totalPence = basket.reduce((sum, [price, quantity]) => sum + price * quantity, 0);
        const purchase = buildPurchase({ transactionId: 'T-000001', lines });
        assert.strictEqual(typeof purchase.ecommerce.value, 'number');
        assert.strictEqual(purchase.ecommerce.value, Math.round(totalPence) / 100);
        for (const item of purchase.ecommerce.items) {
          assert.strictEqual(typeof item.price, 'number');
          assert.ok(Number.isInteger(item.quantity));
        }
      }
    },
  ],
  [
    'top-level keys',
    () => {
      const correct = buildPurchase({
        transactionId: 'T-104233',
        lines: [HERO_LINE],
      });
      const objects: Record<string, unknown>[] = [
        correct as unknown as Record<string, unknown>,
        ...SCENARIOS.map((scenario) => scenario.apply(correct)),
      ];
      for (const obj of objects) {
        assert.ok(
          Object.keys(obj).every((key) => key === 'event' || key === 'ecommerce'),
          `unexpected top-level key in ${JSON.stringify(Object.keys(obj))}`,
        );
      }
    },
  ],
  [
    'exactly one difference per broken scenario',
    () => {
      const correct = buildPurchase({
        transactionId: 'T-104233',
        lines: [HERO_LINE],
      });
      deepFreeze(correct);

      const expectedDiffs: Record<string, string[]> = {
        'missing-value': ['removed ecommerce.value'],
        'value-as-text': ['changed ecommerce.value → "12.99" (string)'],
        'wrong-case-key': [
          'removed ecommerce.transaction_id',
          'added ecommerce.transaction_ID',
        ],
        'lowercase-currency': ['changed ecommerce.currency → "gbp"'],
        'bad-transaction-id': ['changed ecommerce.transaction_id → "12345"'],
      };

      const correctResult = getScenario('correct').apply(correct);
      assert.notStrictEqual(correctResult, correct);
      assert.deepStrictEqual(diff(correct, correctResult), []);

      for (const scenario of SCENARIOS) {
        if (scenario.id === 'correct') {
          continue;
        }
        const result = scenario.apply(correct);
        const actual = diff(correct, result);
        assert.deepStrictEqual(
          actual,
          expectedDiffs[scenario.id],
          `scenario ${scenario.id}`,
        );
      }

      // wrong-case-key: the removed and added values must be equal (one rename).
      const wrong = getScenario('wrong-case-key').apply(correct) as {
        ecommerce: Record<string, unknown>;
      };
      assert.strictEqual(
        wrong.ecommerce.transaction_ID,
        correct.ecommerce.transaction_id,
      );
    },
  ],
  [
    'transaction ids',
    () => {
      for (let i = 0; i < 1000; i += 1) {
        assert.match(newTransactionId(), TRANSACTION_ID_PATTERN);
      }
      assert.doesNotMatch('12345', TRANSACTION_ID_PATTERN);
    },
  ],
  [
    'hero literal',
    () => {
      const correct = buildPurchase({
        transactionId: 'T-104233',
        lines: [HERO_LINE],
      });
      assert.strictEqual(correct.ecommerce.value, 12.99);
      const valueAsText = getScenario('value-as-text').apply(correct) as {
        ecommerce: { value: unknown };
      };
      assert.strictEqual(valueAsText.ecommerce.value, '12.99');
      assert.strictEqual(typeof valueAsText.ecommerce.value, 'string');
    },
  ],
];

let failed = false;
for (const [name, run] of checks) {
  try {
    run();
    console.log(`ok ${name}`);
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`not ok ${name}: ${message}`);
  }
}

if (failed) {
  process.exit(1);
}
