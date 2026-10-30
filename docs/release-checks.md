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

## byo-gtm-container-01M64PAZ — gates and checks (WP11)

Dated evidence for the Phase 5 release checks (T047, T048, T051). The
Product-Owner-dependent steps — Lighthouse on the Pages preview, spike run 2
and the production rehearsal — are recorded here as **not yet run** with the
exact remaining steps, so nothing is claimed before it happens.

### T047 — gates and checks on the merged tree

**Checked:** all four gates, the full-history no-secrets scan, the container
invariants, the scenario invariants and the e2e suite on the merged WP01–WP10
tree.

**How:** run in the WP11 lane worktree (`byo-gtm-container-01M64PAZ-lane-j`).
The pinned pnpm 10.34.7 is on PATH, so the gates were run with `pnpm` directly.
(`corepack pnpm` is not usable here: corepack's shim resolves the gate runner's
child `pnpm` calls to pnpm 12.11.2 and fails with `ERR_PNPM_BAD_PM_VERSION`.
Running `pnpm` directly uses the pinned version, which is what the PATH shim is
for.)

**Environment:** Microsoft Windows 11 Pro, Node v24.15.0, pnpm 10.34.7 (pinned
by `packageManager`), clean worktree at commit `87d1c61`.

**Results:**

| Check | Command | Result |
|---|---|---|
| Dependencies | `pnpm install --frozen-lockfile` | exit 0, 115 packages, "Lockfile is up to date" |
| Gates | `pnpm gates` | `[1/4] lint` … `[4/4] provenance`, `no-secrets: 0 findings`, `provenance: 0 findings`, `gates: all 4 passed` (exit 0) |
| Container invariants | `pnpm verify:container` | exit 0; 10/10 `ok` (constants, well-formed IDs accepted, malformed IDs refused ≥10, parse valid/boundary/tampered, serialise round-trip, choose matrix, scanner flags a real-looking ID, scanner accepts the placeholder, rules file self-contained) |
| Scenario invariants | `pnpm verify:scenarios` | exit 0; 8/8 `ok` (order and ids, no verdict wording, correct objects match contract, value arithmetic, top-level keys, one difference per broken scenario, transaction ids, hero literal) |
| E2E | `pnpm test:e2e` | exit 0; 192 passed (42.4 s) on 7 workers, including the ×10 `container` project (`--repeat-each=10`) |

**Full-history no-secrets (SC-006):** `node scripts/no-secrets.ts --history`
reported **37 findings (exit 1)**, not 0. Every one is a historical false
positive, and none is in the current tree:

- 28 × `cloudflare-token-like` — the auto-generated coordination log
  `kitty-specs/byo-gtm-container-01M64PAZ/status.events.jsonl` (committed by
  spec-kitty, not by any work package) records `lane_head` git SHAs, which are
  40 hex characters. The scanner flags any 40-character token-shaped string on
  a line that also mentions `token`/`key`/`secret`, and those lines say
  "no-secrets 0 findings" in the review reason. The matches are commit SHAs,
  not Cloudflare tokens.
- 9 × `gtm-container-id` — three earlier `spec.md` revisions used a four-X
  placeholder shorter than the allowlisted seven-X form, which is outside the
  scanner's allowlist (`GTM-XXXXXXX`). The current `spec.md` uses the
  allowlisted `GTM-XXXXXXX`.

The working-tree scan inside `pnpm gates` is `no-secrets: 0 findings`, and no
secret is present in the current tree. The `--history` findings are pre-existing
historical false positives in files outside this WP's ownership (the coordination
event log and the planning spec), so they are recorded here, not fixed. If CI's
`--ci` full-history scan must also read 0, those two sources need a scanner
allowlist decision; that is a Product Owner / mission decision, not a WP11 code
change.

**Update 2026-10-30 (after the mission review):** the Product Owner approved
Charter 1.1.1. The scanner now treats any all-X container ID as a placeholder
and skips commit SHAs recorded as Spec Kitty `"lane_head"` values. It skips no
file by path: the post-merge status-file exemption was reverted. Re-run on
commit `dcd0072`: `node scripts/no-secrets.ts --history` gives
`no-secrets: 0 findings` (exit 0), and `pnpm gates --ci` gives
`gates: all 4 passed` (exit 0).

**CI run — not yet available (recorded, not fabricated).** `gh run list --branch
feat/byo-gtm-container --limit 1` returns nothing because `feat/byo-gtm-container`
and the mission branch are still local only; `origin` has `main`, `feat/demo-shop`,
`release/demo-shop` and two `chore/…` branches, and the Product Owner has not yet
approved the first push. The only existing `gates` workflow runs are on `main`
(PR #5) and are green.

**Update 2026-10-30:** the Product Owner pushed `feat/byo-gtm-container` at
`5c9b429` and draft PR #7 was opened into `main`. The `gates` workflow passed on
the push (run 41112813642) and on the PR (run 41113006644). Cloudflare Pages
built the preview with Node 24.15.0 and pnpm 10.34.7, with no missing-ID
warning.

### T048 — Lighthouse LCP on the Pages preview (NFR-004)

**Result: pass (2026-10-30).** Every page's LCP is at most 2.0 s on the Pages
preview, and is in line with the pre-mission baseline.

**How:** Lighthouse 12.8.2 CLI, headless Chrome 156, mode Navigation, device
Mobile, Performance only, default simulated throttling (Slow 4G). Each run used
a fresh profile with no extensions and no saved ID, and the Demo menu closed.

- **Preview:** branch alias `feat-byo-gtm-container.quadrano-demo-shop.pages.dev`,
  deployment `1f59b529`, commit `5c9b429`. It loads the shop's own container.
- **Baseline:** preview `e72b0bd5`, commit `a3c4f96`, from before this mission,
  loading the same container.

Where a page was run more than once, the values are listed in run order.

| Page | Preview LCP (score) | Baseline LCP (score) |
|---|---|---|
| `/` | 861, 1311, 882 ms (100, 100, 100) | 2751, 892 ms (96, 99) |
| `/product/?id=SKU-1001` | 846 ms (100) | 1354 ms (100) |
| `/basket/` | 1389 ms (100) | 1344 ms (100) |
| `/checkout/` | 855 ms (100) | 1342 ms (100) |
| `/thank-you/` | 1397, 878 ms (100, 100) | 1345 ms (100) |

**Other metrics:**
- CLS is 0.000 on every run.
- TBT is between 41 and 139 ms.
- The LCP element is shop text: the wordmark, the product blurb or the footer
  line.
- Load delay and load time are 0 ms on every run. LCP is made up of server
  response time (about 450–690 ms) plus render delay.
- The shop's container (`gtm.js`, 162 kB transferred) loads on every page in
  both builds, and does not delay LCP.
- Run-to-run spread is about 0.85–1.4 s. The one baseline value of 2751 ms is
  an outlier that did not repeat.

**Product Owner's DevTools run:** the Product Owner ran Lighthouse from Chrome
DevTools in their everyday browser. It gave an LCP of 2.5 s on `/`, product,
basket and thank-you, 0.9 s on checkout, and a thank-you score of 86. The four
identical values and the low thank-you score point to the browser
environment, most likely extensions such as Tag Assistant, rather than the
site. The Product Owner accepted the clean-Chrome CLI runs above as the NFR-004
evidence.

### T051 — Production rehearsal check (NFR-006, SC-007)

**Not yet run.** This step needs the mission's PR merged to `main` and production
deployed, with the Product Owner present (a real GTM account and Tag Assistant).

**Remaining steps:**
1. Path 1: fresh browser profile on production, no saved ID; press each of the 7
   playground buttons 10 times; each press must produce its expected Console
   group (see `contracts/datalayer-pushes.md`). Tally per button (n/10).
2. Path 2: fresh, empty container plus a Quadrano Local snippet (in Preview,
   unpublished, or published if T050 switched the copy); enter its ID; repeat
   the 70 presses; tally.
3. SC-007: confirm at least one ✓ group and one ✗ group appear via path 2.
4. Reset to the shop's container; confirm the banner is gone.
5. Record both tally tables with date, browser version and who pressed. Any
   count below 10/10 is recorded and raised with the Product Owner (QDR-006).

**Awaiting Product Owner sign-off.**

| Check | Status | PO initials |
|---|---|---|
| T047 — gates and checks on the merged tree | ✅ local green (full-history scan caveat above) | |
| T048 — Lighthouse LCP on the Pages preview | ✅ pass 2026-10-30; every LCP ≤ 1.4 s (clean-Chrome CLI runs) | |
| T051 — production rehearsal (NFR-006, SC-007) | ⏳ not yet run; awaiting production deploy | |

---

## Sign-off

| Check | Status | PO initials |
|---|---|---|
| T034 — gates green on merged tree (CI pending push) | ✅ local green; CI recorded as pending | |
| T035 — production deploy verified | ⏳ set-up done; awaiting first push and domain | |
| T036 — offline local fallback | ✅ verified | |
| T037 — NFR-001 / NFR-004 / NFR-005 / FR-017 | ✅ verified | |
