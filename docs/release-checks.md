# Release checks — Demo Shop (WP07)

Dated evidence for the release, deploy and local-fallback checks. Each section
records what was checked, how, the environment, the result and the evidence.
The Product Owner signs off at the end.

The production GTM container ID is never written here. Where a built page would
have carried it, it is redacted as `GTM-*******`.

---

## T034 — Full gate run on the merged tree; CI first green run

**Checked:** the four gates (lint → build → no-secrets → provenance) pass on the
fully merged WP01–WP06 tree, the scenario-invariant checker passes, the pre-push
hook is installed and runs, and the full-history no-secrets scan is clean.

**How:** run in the WP07 lane worktree (`demo-shop-01M5QW5Y-lane-g`) with Node
24.15.0 and the pinned pnpm 10.34.7 (invoked through `corepack pnpm`; a PATH shim
routes the gate runner's child `pnpm` calls to the pinned version).

**Environment:** Windows 11, Node v24.15.0, pnpm 10.34.7 (pinned by
`packageManager`), clean worktree at commit `e9f82a7`.

**Results:**

| Check | Command | Result |
|---|---|---|
| Dependencies | `corepack pnpm install --frozen-lockfile` | exit 0, 110 packages, "Lockfile is up to date" |
| Gates | `corepack pnpm gates` | `[1/4] lint` … `[4/4] provenance`, `no-secrets: 0 findings`, `provenance: 0 findings`, `gates: all 4 passed` (exit 0) |
| Scenario invariants | `corepack pnpm verify:scenarios` | exit 0; 8/8 `ok` (order and ids, no verdict wording, contract objects, value arithmetic, top-level keys, one difference per broken scenario, transaction ids, hero literal) |
| Pre-push hook | `git config --get core.hooksPath` | `.githooks` |
| Pre-push (simulated) | synthetic stdin `refs/heads/x <HEAD> refs/heads/x 0000000000000000000000000000000000000000` → `node scripts/gates.ts --pre-push` | `gates: all 4 passed` (exit 0) |
| Full-history no-secrets (SC-006) | `node scripts/no-secrets.ts --history` | `no-secrets: 0 findings` (exit 0) |

**Local denylist:** the provenance gate requires a denylist at
`~/.quadrano/provenance-denylist.txt` (or `QUADRANO_DENYLIST_PATH`). None existed
on this machine, so a local stand-in file was created outside the repo with one
placeholder term. The real denylist is the repository secret
`QUADRANO_PROVENANCE_DENYLIST` used by CI; the local stand-in exists only so the gate runs. The gate passed with
`provenance: 0 findings`.

**CI run — not yet available (recorded, not fabricated).** No green `gates`
workflow run exists yet, for these reasons:

1. The mission and lane branches are local only. `origin` has a single branch,
   `main`, at the Spec Kitty scaffold commit — the shop code has never been
   pushed, and the Product Owner has not yet given the go-ahead to push.
2. `.github/workflows/gates.yml` exists in this lane but not on the default
   branch, so GitHub Actions has never executed the `gates` job.
3. The repository secret exists as `QUADRANO_PROVENANCE_DENYLIST`, but the
   workflow read `PROVENANCE_DENYLIST`, so a CI run would have failed closed at
   provenance. Fixed on 2026-10-25: `gates.yml` now reads
   `QUADRANO_PROVENANCE_DENYLIST` (one-line out-of-map edit, logged in WP07).

**Evidence:** local gate output above (exit codes and summaries). CI evidence will
be added after the mission branch is pushed; then `gh run list` will show the
`gates` check green.

---

## T035 — Production deploy and first-deploy verification

**Status: set-up done 2026-10-25; first build and verification pending the
first push. No deploy evidence is claimed yet.**

The earlier note that no Cloudflare credentials existed was wrong: `wrangler`
4.152.0 is installed with an OAuth login on the PO's account (`pages (write)`),
`quadrano.com` is an active zone in the same account, and the Cloudflare Workers
& Pages GitHub app is installed on `Quadrano-Ltd` for all repositories. The
set-up below was done through the Cloudflare and GitHub APIs, not dashboards.

| Step | State |
|---|---|
| Pages project `quadrano-demo-shop`, Git integration with `Quadrano-Ltd/quadrano-demo-shop`, production branch `main`, `pnpm build` → `dist`, previews for all branches | ✅ created 2026-10-25 |
| `VITE_GTM_CONTAINER_ID` for Production and Preview (plain text; the ID is public in served HTML) | ✅ set 2026-10-25 |
| Custom domain `demo.quadrano.com` | ⏳ needs PO approval to run the Pages domains API call |
| `QUADRANO_PROVENANCE_DENYLIST` repository secret | ✅ already present (2026-10-16) |
| `main` branch protection requiring check `gates` | see WP07 activity log |
| Shop code reaches `main` by PR with green gates | ⏳ after the first push |

**What will be verified after the first deploy** (recorded here when it happens):
build log shows Node 24 and pnpm 10, no blocked-postinstall error for esbuild, no
missing-ID warning; all five paths serve with the inline data layer script first
and the GTM snippet (redacted as `GTM-*******`); GTM Preview shows `add_to_cart`
and `purchase`.

---

## T036 — Local fallback with no network

**Checked:** a local production build serves every page and scenario with no
network, the shop pushes to `window.dataLayer`, and nothing errors when GTM is
unreachable.

**How:** `pnpm build && pnpm preview` (Vite preview at `http://localhost:4173`),
then a headless-Chrome walk with request interception that **aborted every request
to a non-local origin** — simulating "no network" for anything except the local
build itself.

**Environment:** Windows 11, Node v24.15.0, pnpm 10.34.7, Google Chrome
155.0.8059.85 (headless), `vite preview` on `localhost:4173`.

**Results:**

| Check | Result |
|---|---|
| All pages serve | `/`, `/product/?id=SKU-1001&scenario=correct`, `/basket/`, `/checkout/?scenario=correct`, `/thank-you/` (+ scenario variants) → HTTP 200 |
| Data layer first | `dist/index.html` starts `<head>` with `<script>window.dataLayer = window.dataLayer \|\| [];</script>` before any module script; no GTM snippet (no ID set) |
| External origins in build | 0 — no `https?://` URL anywhere in `dist/*.html` or the built assets |
| `add_to_cart` push | clicked **Add to basket** on `/product/?id=SKU-1001` → `{ ecommerce: null }` then `add_to_cart` with currency GBP, value 12.99, one item (`item_id: "SKU-1001"`, `item_name: "Stoneware Mug"`, price 12.99, quantity 1) — exact match |
| `purchase` push, all six scenarios | correct, missing-value, value-as-text, wrong-case-key, lowercase-currency, bad-transaction-id — each pushed exactly once with the expected shape (one difference each, per the contract) |
| Single push per action | each action produced exactly one event push; thank-you reload produced **no** second `purchase` |
| No errors with GTM absent | 0 Console messages and 0 page errors across all pages and the whole flow |

**Evidence:** 33/33 automated browser checks passed (page loads, no-console,
add_to_cart shape, all six purchase shapes, single-push, reload no double-push,
scenario switch no-push). Network interception reported **zero** attempted
requests to non-local origins.

**Runbook note (as required):** GTM and Quadrano only load if their origins are
reachable, so on-stage verdicts need network (or a locally served GTM).

---

## T037 — NFR sweep

### NFR-001 — page speed (LCP ≤ 2 s)

**How:** Lighthouse 12.8.2, mode Navigation, device Mobile, default simulated
throttling (Slow 4G), run against `pnpm preview` (production is not up yet — noted).

| Page | LCP | Performance score | JS transferred | CSS transferred |
|---|---|---|---|---|
| Listing `/` | 950 ms | 100 | 7.3 kB | 1.8 kB |
| Product `/product/?id=SKU-1001` | 951 ms | 100 | 6.9 kB | 1.8 kB |
| Basket `/basket/` | 942 ms | 100 | 5.4 kB | 1.8 kB |
| Checkout `/checkout/` | 1024 ms | 100 | 6.4 kB | 1.8 kB |
| Thank-you `/thank-you/` | 943 ms | 100 | 6.9 kB | 1.8 kB |

All five pages are under the 2 s target.

### NFR-004 — no extra network origins

**How:** DevTools-equivalent request interception over a full talk-script run
(product → add to basket → checkout → place order → thank-you → order again → all
six scenarios), with every non-local request aborted and logged.

**Result:** 0 requests to any origin other than the site's own
(`localhost:4173`). The local build has no GTM ID, so nothing loads from
`www.googletagmanager.com` either. Static review confirms no `https?://` URL in
the built pages or assets, and the lint rule set forbids `fetch`,
`XMLHttpRequest`, `navigator.sendBeacon` and `WebSocket` in shop code.

### NFR-005 — keyboard operable, visible focus ring

**How:** tabbed through each page with Chrome; inspected focus and computed focus
outline; operated the scenario control with the keyboard.

**Result:**

| Control | Result |
|---|---|
| Header wordmark, nav links (Shop / Basket / Checkout) | reachable by Tab; visible focus ring (`outline: solid 3px`) |
| Scenario `<select>` | reachable and operable; ArrowDown changed scenario from `correct` to `missing-value` and updated the URL to `/?scenario=missing-value` |
| Add to basket / Place order / Order again / Continue shopping | reachable by Tab; visible focus ring |
| Listing page total focusable controls | 13 |

### FR-017 — no shop Console output

**How:** full flow with GTM **not** loaded (no ID), Chrome DevTools Console
equivalent ("Verbose") captured via the automation's console listener.

**Result:** 0 Console messages and 0 page errors originate from shop code across
all pages and the whole flow. Page text contains no verdict wording (no ✓ ✗ ⚠ ✅ ❌
and no pass/fail wording) — the shop renders only product/basket/order text. This
is also enforced by construction: `no-console: error` and a verdict-wording lint
rule apply to everything under `site/`.

---

## Sign-off

| Check | Status | PO initials |
|---|---|---|
| T034 — gates green on merged tree (CI pending push) | ✅ local green; CI recorded as pending | |
| T035 — production deploy verified | ⏳ set-up done; awaiting first push and domain | |
| T036 — offline local fallback | ✅ verified | |
| T037 — NFR-001 / NFR-004 / NFR-005 / FR-017 | ✅ verified | |
