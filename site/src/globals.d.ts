/** One runtime Console group for one push, as text (data-model.md). */
interface DemoShopResult {
  readonly kind: 'group';
  readonly header: string;
  readonly lines: readonly string[];
  readonly pushed: string | null;
}

/** A branded single line written outside a group, other than the banner. */
interface DemoShopPlainLine {
  readonly kind: 'line';
  readonly text: string;
}

type DemoShopResultEntry = DemoShopResult | DemoShopPlainLine;

/** Defined by the inline capture script only when the Results view is on. */
interface DemoShopResults {
  readonly bannerSeen: boolean;
  readonly entries: readonly DemoShopResultEntry[];
  readonly storage: 'ok' | 'unavailable';
  listen(fn: () => void): void;
}

// The GA4-style data layer. Created by the inline head script on every page before GTM loads (FR-002).
// Only site/src/datalayer/push.ts writes to it (FR-016, enforced by lint).
interface Window {
  dataLayer?: unknown[];
  __demoShopResults?: DemoShopResults;
}
