# Quickstart: Bring your own GTM container

## Set up (once)

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # explicit browser download; never run by CI or the gates
```

For local runs with the shop's container, put `VITE_GTM_CONTAINER_ID` in a gitignored `.env.local`. Without it, the shop loads no container unless a visitor ID is saved, which is expected.

## Every change

```bash
pnpm gates               # lint → build → no-secrets → provenance (unchanged)
pnpm verify:container    # choice rules, expiry and tamper, ≥10 malformed IDs, no-secrets still fires
pnpm verify:scenarios    # unchanged
pnpm test:e2e            # Playwright + axe; googletagmanager.com is stubbed, so there is no network and no real IDs
```

## What `test:e2e` proves

| Spec | Proves |
|---|---|
| `e2e/container.spec.ts` (`--repeat-each=10`) | NFR-001, SC-001, SC-002: 5 pages × {no saved ID, saved ID} → exactly 1 `gtm.js` request with the expected `id`, 0 for the other. Reset brings back the shop's. Expired, tampered and future-dated values load the shop's. A throwing `localStorage` (init script) loads the shop's and shows the note. |
| `e2e/address.spec.ts` | SC-004, FR-013: at least 5 crafted links carrying a container ID, in both states, change nothing |
| `e2e/menu.spec.ts` | FR-005 to FR-010, SC-003: well-formed save and reload; ≥10 malformed IDs refused with nothing saved; banner on every page; path 1 behaves as reset |
| `e2e/playground.spec.ts` | SC-005, FR-015, FR-017, NFR-005: each of the 7 buttons adds exactly `[{ecommerce:null}, <event>]`, deep-equal to the contract shape (with a matched transaction id); open, close, path, reset and scenario change add 0. A `?scenario=` link still sets the switcher (SC-006) |
| `e2e/a11y.spec.ts` | NFR-002, FR-020: axe reports 0 violations on 5 pages × {menu open, closed} × {banner, none}; keyboard-only open, Escape and focus return; every control reachable by Tab |
| `e2e/layout.spec.ts` | NFR-003, FR-021: at a 360 px viewport, `scrollWidth ≤ clientWidth` with the menu open and closed, with the banner shown |

## Manual, before rehearsals (record in `docs/release-checks.md`)

1. **NFR-004**: run Lighthouse in Chrome DevTools (mobile, default Slow 4G) on all 5 pages of the preview deployment with the menu closed. Pass if LCP ≤ 2 s.
2. **Spike run 2 (FR-023, Product Owner)**: follow `docs/spike/preview-spike.md` "Run 2" on the Pages preview of `feat/byo-gtm-container`. Record redacted screenshots. If the container doesn't run unpublished, switch the path 2 copy as in [contracts/visitor-menu.md](contracts/visitor-menu.md).
3. **NFR-006 / SC-007**: on production, press each of the 7 playground buttons 10 times:
   - through path 1 (the shop's published Quadrano tag);
   - through path 2, with a fresh empty container and a Quadrano Local snippet.

   Each press must produce the expected Console group from the push contract.
