# Research: Bring your own GTM container

Phase 0 for `byo-gtm-container-01M64PAZ`. Each entry gives the decision, the rationale and the alternatives considered. The spec and the plan-phase decision `DM-01M64TAJ14KYVH94V2RCQPC8AY` left nothing marked NEEDS CLARIFICATION.

## R-01 — Where and how the container is chosen

**Decision**: An inline classic `<script>` replaces the `<!-- gtm:head -->` marker, which already sits directly after `window.dataLayer = window.dataLayer || []` in every page's `<head>`. The `quadrano-gtm` plugin in `vite.config.ts` builds it from three parts:

1. The source of `site/src/container/active-container.ts`, with its types stripped by Vite's `transformWithOxc` and its top-level `export` keywords removed, wrapped in an IIFE.
2. The shop's ID, as a JSON string literal or `null` (validated with the same pattern, as today).
3. The existing GTM snippet body, run only if an ID was chosen.

Module scripts are deferred, so this script runs before any page code. The thank-you page's `purchase` and every click push can only happen after a container has been chosen and requested (FR-002).

**Rationale**: It keeps one source for the choice rules, which the menu also imports. It adds no extra request (NFR-004) and runs synchronously.

**Rules for the file**: no `import`; no references to names outside the file except `localStorage`, `Date` and `document`; only top-level `export const` and `export function` declarations. The plugin fails the build if the transformed output still contains `import` or `export`, which is a cheap guard against the file stopping being self-contained.

**Alternatives considered**:
- A blocking `<script src="/container.js">`: one more render-blocking request.
- Hand-written JavaScript in `vite.config.ts`: the rules would be duplicated in the menu and could drift.
- Choosing in a module script: modules run after parsing, which is too late for FR-002 and would race with the thank-you page push.
- `Function.prototype.toString()` on an imported function: fragile, because the bundler can rename helpers.

## R-02 — `localStorage`, not `sessionStorage`

**Decision**: The saved ID lives in `localStorage` under `demo-shop:visitor-container`.

**Rationale**: GTM Preview (Tag Assistant) opens the site in a new window. `sessionStorage` is per tab, so the visitor's container would be missing in exactly the window that matters. The 24-hour expiry (FR-011) bounds the lifetime that `localStorage` would otherwise leave open.

**Alternatives considered**: `sessionStorage` (breaks Preview); a cookie (it would be sent with every request for no benefit and widens the cross-subdomain surface); the address (forbidden by FR-013 and C-005).

## R-03 — Saved value, expiry and tamper handling

**Decision**: The value is `JSON.stringify({ id, savedAt })`, where `savedAt` is `Date.now()` at save time. It counts as the visitor's container only if all of these hold:

- it parses as JSON;
- it is an object with exactly the keys `id` and `savedAt`;
- `id` matches `^GTM-[A-Z0-9]{4,10}$`;
- `savedAt` is a finite integer;
- `0 ≤ now − savedAt < 86 400 000`.

In every other case the loader removes the key (guarded) and treats it as absent.

**Rationale**: A value edited by hand, set in the future (to dodge expiry) or older than 24 hours never loads (Edge Cases, FR-011). Removing it means the menu shows no stale state.

**Alternatives considered**: storing an expiry time instead of the save time (the same thing, but it makes "dated in the future" less obvious to check); a tolerance for clock skew (unnecessary, because the same browser clock writes and reads the value).

## R-04 — Storage failure

**Decision**: There are two guarded layers.

- The loader wraps the whole `localStorage` access, including the property read itself, which throws in some locked-down browsers, in `try/catch`. On any throw it loads the shop's container and sets `data-storage="unavailable"` on `<html>`.
- `visitor-storage.ts` exposes `probe()`, `save(id)` and `clear()`. Each returns a result instead of throwing.
  - `probe()` writes, reads and removes a probe key.
  - `save()` writes, then reads the value back and compares.
  - The menu shows the "unavailable in this browser" note if the `<html>` flag is set or `probe()` returns false. Path 2's input is then disabled.

The basket's `storage.ts` in-memory fallback is deliberately not reused: a memory-only save would look as if it worked, but the next page would load the shop's container.

**Alternatives considered**: reusing `storage.ts` (wrong semantics, and it is `sessionStorage`); feature-detecting with `'localStorage' in window` (doesn't catch the throwing cases).

## R-05 — Address never chooses (FR-013, C-005)

**Decision**: Neither `active-container.ts` nor any menu code reads `location`, `URLSearchParams` or `document.referrer` to get a container. The ID only reaches storage from a submit on the menu's form. An e2e test drives at least 5 crafted links (`?gtm=`, `?id=`, `#GTM-…`, `?gtm_id=`, `/GTM-…/` path, and combinations with `?scenario=`) in both states and asserts the container request is unchanged (SC-004). Tag Assistant's own `gtm_debug` and `gtm_auth` parameters are GTM's business and are not read by the shop.

**Alternatives considered**: a lint rule forbidding `location` in `site/src/container/**`. That is cheap and worth having, so the plan includes it as a `no-restricted-globals`/`no-restricted-properties` override for that folder.

## R-06 — Menu interaction pattern

**Decision**: A disclosure (not a modal dialog).

- A fixed-position `<button type="button" aria-expanded aria-controls>` with visible text opens a non-modal panel (`role="region"`, labelled by its heading).
- On open, focus moves to the panel heading (`tabindex="-1"`).
- Escape inside the panel or on the button closes it and returns focus to the button.
- A close button sits inside the panel. An outside click does not close it, so a stray tap on a phone doesn't lose the panel's state.

The banner sits in normal flow above the header, so it can't cover content and doesn't need its own overflow handling.

**Rationale**: It is the simplest pattern that meets FR-020. A modal would trap focus and hide the page, which gets in the way of pressing playground buttons while watching the page.

**Alternatives considered**: `<dialog>` with `showModal()` (traps focus, hides the page); the `popover` attribute (light-dismiss on outside click, and its focus return varies across browsers).

## R-07 — Playground beside the switcher

**Decision**: The playground sits beside the existing header scenario switcher; it doesn't absorb it.

- Each button names its push explicitly and calls `pushAddToCart(heroLine)` or `pushPurchase({ transactionId: newTransactionId(), lines: [heroLine], scenario })`.
- Pressing a button doesn't change `?scenario=`, the switcher or the order store.
- The hero line is built from `getProductOrHero(HERO_PRODUCT_ID)`, so the purchase `value` is `12.99`, matching the contract's example messages.

**Rationale**: FR-018 then holds without touching `switcher/`. No push code changes, so FR-015 and FR-016 hold by construction.

**Alternatives considered**: absorbing the switcher into the menu (it changes talk-script behaviour and needs FR-018 re-proved); a playground that uses the active scenario (two interactions for a broken push, which strains NFR-005).

## R-08 — Supply chain: Playwright and axe (DIRECTIVE_051)

The packages are dev-only and never shipped to the site. They were checked on 2026-10-29 against `https://registry.npmjs.org/` (the configured registry).

| Package | Version | License | Registry | First published | This version published | Age at check | Install scripts |
|---|---|---|---|---|---|---|---|
| `@playwright/test` | 1.64.1 | Apache-2.0 | registry.npmjs.org | 2020-09-24 | 2026-10-14 | 15 days | none |
| `playwright` (transitive) | 1.64.1 | Apache-2.0 | registry.npmjs.org | 2015-01-23 | 2026-10-14 | 15 days | none; optional `fsevents` (macOS only) |
| `playwright-core` (transitive) | 1.64.1 | Apache-2.0 | registry.npmjs.org | 2020-01-17 | 2026-10-14 | 15 days | none |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | registry.npmjs.org | 2021-06-02 | 2026-10-15 | 14 days | none |
| `axe-core` (transitive) | 4.14.0 | MPL-2.0 | registry.npmjs.org | 2015-06-08 | 2026-10-05 | 24 days | none at install (`pre*`/`post*` scripts are build and test only) |

The five controls:

1. **Registry authenticity**: all resolve from `registry.npmjs.org` under their long-standing names (Microsoft and Deque scopes); there is no typosquat risk in `@playwright/test` or `@axe-core/playwright`. The implementer records the resolved host from `pnpm-lock.yaml` `resolution.tarball`/`integrity`.
2. **Freshness**: every version is older than the repo's `minimumReleaseAge: 10080` (7 days), so pnpm will resolve these or older. Nothing was published inside an elevated window.
3. **Lifecycle scripts**: none on install. `onlyBuiltDependencies: []` stays empty, so nothing is allowlisted.
4. **Lockfile**: `pnpm-lock.yaml` is committed. CI keeps `--frozen-lockfile`. The lockfile diff is reviewed for unexpected transitive additions; the expected ones are only `playwright`, `playwright-core`, `axe-core` and the optional `fsevents`.
5. **IoC and incident posture**: the implementer checks the GitHub Advisory Database and `pnpm audit` for these package versions at install time and records the result. Browser binaries are fetched by an explicit `pnpm exec playwright install chromium` from Playwright's own CDN, never during `pnpm install`. That command is documented in `AGENTS.md` and is never run by CI or the gates.

**License note (QDR-001)**: MPL-2.0 is file-level copyleft. axe-core is used unmodified as a test tool and never distributed with the site, so it places no obligation on the shop.

**Adversarial evidence**: the adversarial squad pass is **deferred**. The rationale: dev-only dependencies with no install scripts and no shipped code, a 7-day release-age floor, a frozen lockfile in CI, and gates that don't run them. The review of the dependency work package re-checks controls 4 and 5 with the real lockfile diff. Findings from the planner's own challenge pass:

| # | Contested finding | Disposition |
|---|---|---|
| A-1 | Playwright downloads browser binaries outside the lockfile's integrity checks. | **Accepted with mitigation**: an explicit, documented command only, never in `install`, CI or the gates. Chromium only. |
| A-2 | MPL-2.0 could conflict with QDR-001. | **Rejected**: unmodified dev tool, not distributed. Recorded above. |
| A-3 | e2e tests could leak a real container ID into tracked files or build output. | **Accepted, designed out**: IDs are built at run time, the build goes to the gitignored `.e2e-dist/`, and every googletagmanager.com request is intercepted and fulfilled locally (no network). |
| A-4 | A new dependency weakens "nothing heavier" (QDR-003). | **Rejected**: the tests are not gates. The gate set and order are unchanged. |

## R-09 — Charter 1.1.0 content and mechanism

**Decision**: A minor amendment, dated the day it is committed.

- **QDR-002** (`charter.yaml` description, the Policy Summary bullet and the Approved stack "Analytics / GTM" row) allows exactly one GTM container per page, installed by a script tag. That is either the shop's own container, or one the visitor types into the on-page menu, kept only in that visitor's browser for at most 24 hours. Never one named by the page address, a link or another site.
- A new **"Dev tooling (not shipped)"** row lists Playwright and axe for non-gate end-to-end and accessibility checks, as recorded in `AGENTS.md`.
- **Scoping**: the demo-shop mission's NFR-004 (no extra network) and C-011 (no consent banner) cover only the shop's own container. What a visitor's container loads is the visitor's choice. FR-003 of the demo-shop mission is superseded by this mission's FR-001. The demo-shop spec rows get an inline "Scoped by Charter 1.1.0" annotation; their text doesn't otherwise change.
- **QDR-004**: the wording changes to "the shop's own GTM container ID". The rule doesn't change.
- **Mechanism statement**: no gate changes. The no-secrets gate is unchanged in behaviour; FR-019's check proves this. The existing lint rules (`dataLayer` writer, network calls, verdict wording) are unchanged. A new lint override forbids `location` in `site/src/container/**` (R-05). `test:e2e` is added as non-gate evidence for the one-container rule.
- **Log row**: `1.1.0 | <date> | Minor | One GTM container per page, the shop's or the visitor's, never from the address; Playwright and axe as dev-only tooling; demo-shop NFR-004 and C-011 scoped to the shop's own container.`

**Alternatives considered**: major (rejected in `DM-01M64RAA19WKDR4DQ969WWGG9A`); a separate PR first (rejected in the same decision).

## R-10 — Test design without real IDs (FR-019)

**Decision**:

- `playwright.config.ts` builds with `VITE_GTM_CONTAINER_ID` set to an ID built at run time (for example `['GTM', 'SHOPE2E'].join('-')`) into `.e2e-dist/`, then serves it with `vite preview`.
- Visitor IDs are built the same way.
- Every `https://www.googletagmanager.com/**` request is routed to a stub that returns an empty script and records the `id` query value. NFR-001 asserts exactly one recorded request per load, and that it is the expected one.
- The NFR-001 spec runs with `--repeat-each=10`.
- Pushes are counted by reading `window.dataLayer` in `page.evaluate`, ignoring entries whose `event` starts with `gtm.`.
- `scanText` moves to `scripts/lib/secret-scan.ts` and returns its findings. `no-secrets.ts` imports it and behaves identically. `verify:container` asserts that it flags a real-looking ID built at run time (`GTM-` followed by 7 upper-case letters and digits) and accepts `GTM-XXXXXXX`.

**Rationale**: no container-ID-shaped literal ever appears in a tracked file. The pattern `\bGTM-[A-Z0-9]{4,10}\b` does not match `'GTM-' + x` or `['GTM', x].join('-')`.

**Alternatives considered**: allowlisting a second fake ID in the gate (it weakens the gate); hitting real GTM (network, and a real ID).
