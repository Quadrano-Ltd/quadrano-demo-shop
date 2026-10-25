// The GA4-style data layer. Created by the inline head script on every page before GTM loads (FR-002).
// Only site/src/datalayer/push.ts writes to it (FR-016, enforced by lint).
interface Window {
  dataLayer?: unknown[];
}
