import {
  buildAddToCart,
  buildNewsletterSignup,
  buildNewsletterSignupOptInAsText,
  buildPurchase,
  type PushLine,
  type SignupLocation,
} from './events.ts';
import { getScenario, type ScenarioId } from './scenarios.ts';

/**
 * The ONLY module that writes to `window.dataLayer` (FR-016).
 *
 * Every ecommerce action pushes `{ ecommerce: null }` (the GA4 ecommerce clear)
 * followed by exactly one event. The custom `newsletter_signup` event has no
 * `ecommerce` group, so it is a single push with no clear. No retries, no timers, no Console output, and no
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

/** Custom event, one push, no ecommerce clear. */
export function pushNewsletterSignup(input: {
  location: SignupLocation;
  marketingOptIn: boolean;
}): void {
  const dl = (window.dataLayer ??= []);
  dl.push(buildNewsletterSignup(input));
}

/** The deliberately broken variant: `marketing_opt_in: "true"` (text). */
export function pushNewsletterSignupOptInAsText(): void {
  const dl = (window.dataLayer ??= []);
  dl.push(buildNewsletterSignupOptInAsText());
}
