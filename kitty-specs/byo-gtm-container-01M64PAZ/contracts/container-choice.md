# Contract: Container choice

Covers the head loader built from `site/src/container/active-container.ts`, the storage value, and what page code may rely on. Requirements: FR-001 to FR-004, FR-011 to FR-013, C-005.

## `site/src/container/active-container.ts` (public surface)

The file is self-contained: no `import`, and only top-level `export const` and `export function` declarations (research R-01). The build fails if the inlined output still contains `import` or `export`.

```ts
export const VISITOR_CONTAINER_KEY = 'demo-shop:visitor-container';
export const CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]{4,10}$/;
export const SAVED_ID_LIFETIME_MS = 86_400_000; // 24 h (FR-011)

/** True only for an ID entered exactly as GTM shows it. */
export function isContainerId(value: unknown): value is string;

/** Parses a raw stored string. Returns the ID if valid and unexpired at `now`, else null. Never throws. */
export function parseSavedContainer(raw: string | null, now: number): string | null;

/** Serialises a value for storage. The caller has already checked isContainerId(id). */
export function serialiseSavedContainer(id: string, now: number): string;

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
}): { source: ContainerSource; id: string | null; removeSaved: boolean };
```

## Inline head script (emitted by `quadrano-gtm`)

It replaces `<!-- gtm:head -->`, which follows the `dataLayer` initialiser. In order:

1. Read `localStorage.getItem(VISITOR_CONTAINER_KEY)` inside `try`. Any throw sets `storageOk = false`.
2. `chooseContainer({ raw, storageOk, shopId: <build-time JSON literal or null>, now: Date.now() })`.
3. If `removeSaved`, call `localStorage.removeItem(...)` inside `try`.
4. Set the attributes on `document.documentElement`:
   - `data-container-source="visitor|shop|none"`
   - `data-visitor-container="<ID>"`, only when the source is `visitor`
   - `data-storage="unavailable"`, only when `storageOk` is false
5. If an ID was chosen, run the standard GTM snippet with it. That pushes `{'gtm.start', event:'gtm.js'}` and inserts `https://www.googletagmanager.com/gtm.js?id=<ID>` as an async script. The ID has passed `CONTAINER_ID_PATTERN`, so it is safe in the URL.

It must never read `location`, `document.referrer` or `URLSearchParams` (FR-013; lint override on `site/src/container/**`).

`<!-- gtm:body -->` stays as today: a `<noscript>` iframe with the shop's ID only, or nothing (FR-004).

## Page code may rely on

- the three `<html>` attributes above, set before any module runs;
- `visitor-storage.ts`:

```ts
export function probe(): boolean;                          // write, read and remove a probe key; false on any throw or mismatch
export function save(id: string): 'saved' | 'unavailable'; // write, then read back and compare
export function clear(): 'cleared' | 'unavailable';
```

`save` is only called after `isContainerId(id)`. A reload follows `saved` and `cleared`.

## Not allowed

- Two `gtm.js` requests on one page load, in any state.
- Any container ID taken from the address, a link, `postMessage`, another origin or a default other than the shop's build-time ID.
- An in-memory fallback for the saved ID.
- A container-ID-shaped literal other than `GTM-XXXXXXX` in any tracked file.
