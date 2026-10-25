import type { PurchasePush } from './events.ts';

/**
 * The six demo scenarios in talk-script order (FR-007 to FR-012).
 *
 * Each broken scenario returns a NEW object (via structuredClone) that differs
 * from the correct purchase in exactly one way. No scenario touches
 * `add_to_cart`, and none mutates its input.
 */

export const SCENARIO_IDS = [
  'correct',
  'missing-value',
  'value-as-text',
  'wrong-case-key',
  'lowercase-currency',
  'bad-transaction-id',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const DEFAULT_SCENARIO_ID: ScenarioId = 'correct';

export interface Scenario {
  readonly id: ScenarioId;
  readonly label: string; // shown in the switcher; no verdict wording
  readonly order: number; // talk-script position
  readonly talkScript: boolean; // false only for the spare
  readonly apply: (
    correct: Readonly<PurchasePush>,
  ) => Record<string, unknown>; // returns a NEW object; never mutates input
}

/** Mutable shape for a cloned purchase, for the one-difference edits. */
type MutablePurchase = {
  event: string;
  ecommerce: Record<string, unknown>;
};

function clone(correct: Readonly<PurchasePush>): MutablePurchase {
  return structuredClone(correct);
}

const scenarioDefinitions: readonly Scenario[] = [
  {
    id: 'correct',
    label: 'Correct',
    order: 0,
    talkScript: true,
    apply: (correct) => structuredClone(correct),
  },
  {
    id: 'missing-value',
    label: '1 · Missing value',
    order: 1,
    talkScript: true,
    apply: (correct) => {
      const copy = clone(correct);
      delete copy.ecommerce.value;
      return copy;
    },
  },
  {
    id: 'value-as-text',
    label: '2 · Value as text',
    order: 2,
    talkScript: true,
    apply: (correct) => {
      const copy = clone(correct);
      copy.ecommerce.value = '12.99'; // the literal string (R-05)
      return copy;
    },
  },
  {
    id: 'wrong-case-key',
    label: '3 · Wrong-case key',
    order: 3,
    talkScript: true,
    apply: (correct) => {
      const copy = clone(correct);
      const { transaction_id, ...rest } = copy.ecommerce;
      // Rebuild ecommerce so the renamed key keeps its position.
      copy.ecommerce = { transaction_ID: transaction_id, ...rest };
      return copy;
    },
  },
  {
    id: 'lowercase-currency',
    label: '4 · Lower-case currency',
    order: 4,
    talkScript: true,
    apply: (correct) => {
      const copy = clone(correct);
      copy.ecommerce.currency = 'gbp';
      return copy;
    },
  },
  {
    id: 'bad-transaction-id',
    label: 'Spare · Bad transaction ID',
    order: 5,
    talkScript: false,
    apply: (correct) => {
      const copy = clone(correct);
      copy.ecommerce.transaction_id = '12345';
      return copy;
    },
  },
];

export const SCENARIOS: readonly Scenario[] = [...scenarioDefinitions].sort(
  (a, b) => a.order - b.order,
);

export function isScenarioId(v: unknown): v is ScenarioId {
  return typeof v === 'string' && (SCENARIO_IDS as readonly string[]).includes(v);
}

export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS.find((entry) => entry.id === id);
  if (scenario === undefined) {
    throw new Error(`Unknown scenario: ${String(id)}`);
  }
  return scenario;
}
