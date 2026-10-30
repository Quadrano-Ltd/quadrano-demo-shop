/**
 * Container choice rules (FR-006, FR-011, FR-012, FR-013, C-001).
 *
 * Self-contained by design: the `quadrano-gtm` Vite plugin inlines this file's
 * source into every page's `<head>` (WP04), while the visitor menu imports it
 * as a module (WP06). To keep both uses safe this file has no `import` and
 * references nothing outside itself except the ECMAScript built-ins `JSON`,
 * `Object`, `Number` and `Array`. It never reads the page address; storage and
 * DOM access are the head loader's job.
 */

export const VISITOR_CONTAINER_KEY = 'demo-shop:visitor-container';
export const CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]{4,10}$/;
export const SAVED_ID_LIFETIME_MS = 86_400_000; // 24 h (FR-011)

/** True only for an ID entered exactly as GTM shows it (no trimming, no case change). */
export function isContainerId(value: unknown): value is string {
  return typeof value === 'string' && CONTAINER_ID_PATTERN.test(value);
}

/** Serialises a value for storage. The caller has already checked isContainerId(id). */
export function serialiseSavedContainer(id: string, now: number): string {
  return JSON.stringify({ id, savedAt: now });
}

/** Parses a raw stored string. Returns the ID if valid and unexpired at `now`, else null. Never throws. */
export function parseSavedContainer(raw: string | null, now: number): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== 2 || !Object.hasOwn(obj, 'id') || !Object.hasOwn(obj, 'savedAt')) {
    return null;
  }

  const { id, savedAt } = obj;
  if (!isContainerId(id)) {
    return null;
  }
  if (typeof savedAt !== 'number' || !Number.isInteger(savedAt)) {
    return null;
  }

  const age = now - savedAt;
  if (age < 0 || age >= SAVED_ID_LIFETIME_MS) {
    return null;
  }

  return id;
}

export type ContainerSource = 'visitor' | 'shop' | 'none';

/**
 * Pure choice: the visitor's ID if valid, else the shop's (if it is an ID), else none.
 * `storageOk` false forces the shop's or none.
 */
export function chooseContainer(input: {
  raw: string | null;
  storageOk: boolean;
  shopId: string | null;
  now: number;
}): { source: ContainerSource; id: string | null; removeSaved: boolean } {
  const shop = isContainerId(input.shopId) ? input.shopId : null;

  if (input.storageOk && input.raw !== null) {
    const visitor = parseSavedContainer(input.raw, input.now);
    if (visitor !== null) {
      return { source: 'visitor', id: visitor, removeSaved: false };
    }
    return shop !== null
      ? { source: 'shop', id: shop, removeSaved: true }
      : { source: 'none', id: null, removeSaved: true };
  }

  return shop !== null
    ? { source: 'shop', id: shop, removeSaved: false }
    : { source: 'none', id: null, removeSaved: false };
}
