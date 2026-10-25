import { buildAddToCart, buildPurchase, type PushLine } from './events.ts';
import { getScenario, type ScenarioId } from './scenarios.ts';

/**
 * The ONLY module that writes to `window.dataLayer` (FR-016).
 *
 * Every action pushes `{ ecommerce: null }` (the GA4 ecommerce clear) followed
 * by exactly one event. No retries, no timers, no Console output, and no
 * return value that invites the caller to push again.
 */

function pushEvent(obj: object): void {
  // The inline head script normally creates dataLayer first (FR-002); this is
  // defensive only.
  const dl = (window.dataLayer ??= []);
  dl.push({ ecommerce: null });
  dl.push(obj);
}

export function pushAddToCart(line: PushLine): void {
  pushEvent(buildAddToCart(line));
}

export function pushPurchase(input: {
  transactionId: string;
  lines: readonly PushLine[];
  scenario: ScenarioId;
}): void {
  pushEvent(
    getScenario(input.scenario).apply(
      buildPurchase({ transactionId: input.transactionId, lines: input.lines }),
    ),
  );
}
