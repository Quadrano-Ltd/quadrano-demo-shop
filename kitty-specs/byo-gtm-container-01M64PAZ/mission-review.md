# Mission Review Report: byo-gtm-container-01M64PAZ

**Reviewer**: Claude Code (Opus 5.5), post-merge mission review skill
**Date**: 2026-10-30
**Mission**: `byo-gtm-container-01M64PAZ`: Bring your own GTM container
**Baseline commit**: `a3c4f96` (`git merge-base main HEAD`). See note below.
**HEAD at review**: `2b85085`
**WPs reviewed**: WP01..WP11 (all `done`)

> **Baseline note.** `meta.json` records `baseline_merge_commit: ebbc191` ("chore: WP11 claimed for implementation"). That commit is mid-mission: WP01 to WP07 (including WP02's only commit `6aab444`) are its ancestors, so `git diff ebbc191..HEAD` hides them. This review uses the true merge-base with `main`, `a3c4f96`.

---

## Gate Results

### Gate 1: Contract tests
- Command: N/A
- Result: **NOT APPLICABLE**
- Notes: this gate runs the `spec-kitty` repository's `tests/contract/`. This repo is a static site with no such suite. The project's own equivalent is QDR-003's four gates (see "Project gates" below).

### Gate 2: Architectural tests
- Command: N/A
- Result: **NOT APPLICABLE**
- Notes: same reason as Gate 1. The closest project equivalents are the ESLint layer rules (no `dataLayer` outside `push.ts`, and no address reads in `site/src/container/**`), and they pass.

### Gate 3: Cross-repo E2E
- Command: N/A (`spec-kitty-end-to-end-testing` is not present and is not a dependency of this repo)
- Result: **NOT APPLICABLE**
- Notes: the mission makes no cross-repo behaviour claims. C-004 keeps `quadrano-web` untouched, and the diff confirms it.

### Gate 4: Issue Matrix
- File: `kitty-specs/byo-gtm-container-01M64PAZ/issue-matrix.json`: **absent**
- Rows: 0
- Result: **FAIL (artefact missing)**
- Notes: `spec.md` cites GitHub issue Quadrano-Ltd/quadrano-demo-shop#4, so finalize-tasks should have scaffolded the matrix. Regenerate it with `spec-kitty agent mission finalize-tasks --mission byo-gtm-container-01M64PAZ`; don't hand-author it. The only issue is the mission's own source issue, so this is mostly a bookkeeping gap. It is still a hard gate.

### Project gates (QDR-003, the gates this repo actually enforces)

| Command | Exit | Result |
|---|---|---|
| `pnpm gates` (pre-push / local) | 0 | lint, build, no-secrets 0 findings, provenance 0 findings |
| `pnpm gates --ci` (**what `.github/workflows/gates.yml` runs**) | **1** | `no-secrets: 11 findings` · `gates: failed at no-secrets` |
| `node scripts/no-secrets.ts --history` | **1** | 11 findings (see RISK-1) |
| `pnpm verify:container` | 0 | 10/10 ok |
| `pnpm verify:scenarios` | 0 | 8/8 ok |
| `pnpm test:e2e` | 0 | 192 passed (51.0 s), including the ×10 container project |

---

## FR Coverage Matrix

| FR ID | Description (brief) | WP Owner | Test File(s) | Test Adequacy | Finding |
|---|---|---|---|---|---|
| FR-001 | One container per page | WP04, WP08 | `e2e/container.spec.ts` (5 pages × both states × 10) | ADEQUATE | — |
| FR-002 | Container chosen before first push | WP04 | none asserts ordering | PARTIAL | RISK-3 |
| FR-003 | Shop ID stays out of repo | WP01, WP04 | no-secrets gate; `playwright.config.ts` builds the ID at run time | ADEQUATE | — |
| FR-004 | No-script fallback | WP04 | none (no JS-disabled test) | MISSING | RISK-4 |
| FR-005 | Menu on every page | WP06, WP09 | `menu.spec.ts`, `a11y.spec.ts` | ADEQUATE | — |
| FR-006 | Path 2 save | WP03, WP06, WP09 | `menu.spec.ts` (save, reload, stored shape, age) | ADEQUATE | — |
| FR-007 | Malformed ID refused | WP06, WP09 | `menu.spec.ts` (14 inputs, both states; storage, URL, reload and pushes unchanged) | ADEQUATE | — |
| FR-008 | Saved ID across pages | WP06, WP09 | `menu.spec.ts`, `container.spec.ts` | ADEQUATE | — |
| FR-009 | Banner | WP06, WP09 | `menu.spec.ts`, `container.spec.ts` | ADEQUATE | — |
| FR-010 | Reset (banner, menu, path 1) | WP06, WP09 | `container.spec.ts`, `menu.spec.ts` | ADEQUATE | — |
| FR-011 | 24 h expiry | WP03, WP08 | `container.spec.ts` (expired, just-under, future-dated), `verify-container.ts` | ADEQUATE | — |
| FR-012 | Storage failure fallback | WP03, WP04, WP06, WP08 | `container.spec.ts` (throwing getter, junk, extra key, lower case) | ADEQUATE | — |
| FR-013 | Address never sets container | WP03, WP08 | `address.spec.ts` (7 crafted links × both states); lint override; build-time guard in `vite.config.ts` | ADEQUATE | — |
| FR-014 | 7 playground buttons | WP05 | `playground.spec.ts` (count and order) | ADEQUATE | — |
| FR-015 | One push per press, contract shape | WP05, WP09 | `playground.spec.ts` (shapes hand-written from the contract, not imported from `site/`) | ADEQUATE | — |
| FR-016 | No new events or Attributes | WP05 | `playground.spec.ts` exact `toEqual` | ADEQUATE | — |
| FR-017 | Menu actions push nothing | WP06, WP09 | `menu.spec.ts` | ADEQUATE | — |
| FR-018 | Scenario links still work | WP05, WP09 | `playground.spec.ts`, `address.spec.ts` | ADEQUATE | — |
| FR-019 | No-secrets gate not weakened | WP07 | `verify-container.ts` (calls `scanText` only) | PARTIAL | DRIFT-1 |
| FR-020 | Accessible menu | WP06, WP10 | `a11y.spec.ts` (axe WCAG 2.2 AA matrix, keyboard flows) | ADEQUATE | — |
| FR-021 | 360 px | WP06, WP10 | `layout.spec.ts` | ADEQUATE | — |
| FR-022 | No shop verdicts | WP06 | `menu.spec.ts` refusal-copy regex; existing `site/` lint | ADEQUATE | — |
| FR-023 | Preview spike recorded | WP11 | `docs/spike/preview-spike.md`: run 1 recorded, **run 2 pending** | OPEN (disclosed) | DRIFT-2 |
| FR-024 | Path 2 copy follows spike | WP06, WP11 | copy is provisional; acceptance matrix records `pass` | PARTIAL | DRIFT-2 |
| FR-025 | Charter 1.1.0 | WP01, WP02 | doc diff reviewed; md and yaml agree | ADEQUATE | — |
| FR-026 | Push-contract playground note | WP02 | `datalayer-pushes.md:19` | ADEQUATE | — |

| NFR | Status |
|---|---|
| NFR-001 | Proven by `container.spec.ts` with `repeatEach: 10` |
| NFR-002 | Proven by `a11y.spec.ts` (no rules disabled; tags `wcag2a/aa`, `wcag21a/aa`, `wcag22aa`) |
| NFR-003 | Proven by `layout.spec.ts` (5 pages × banner × menu at 360 px) |
| NFR-004 | **Not run.** Needs the Pages preview (recorded honestly in `docs/release-checks.md` T048) |
| NFR-005 | Proven by `playground.spec.ts` (open, then press, for all 7) |
| NFR-006 | **Not run.** Needs a production rehearsal (T051) |

**Legend**: ADEQUATE = the test constrains the required behaviour. PARTIAL = a test exists but does not constrain the whole requirement. MISSING = no test. OPEN = the deliverable is explicitly pending.

---

## Drift Findings

### DRIFT-1: No-secrets gate weakened after merge, outside any WP

**Type**: LOCKED-DECISION VIOLATION
**Severity**: HIGH
**Spec reference**: C-002 ("the no-secrets gate is not weakened"), FR-019, QDR-004; Charter review checklist item 2 (scope)
**Evidence**:
- Commit `2b85085` (2026-10-30 00:35, about 5 minutes after `merged_at`), `scripts/no-secrets.ts`:
  `const COORDINATION_STATUS_FILE = /^kitty-specs\/[^/]+\/status\.(?:json|events\.jsonl)$/;`
  This is applied with `continue` in all three scan loops: working tree, introduced ranges and `--history`.
- No WP owns this change, no review cycle covers it, and the mission's commit range has no Charter amendment for it.

**Analysis**: the exemption skips **every** pattern for those files, not only the 40-character `cloudflare-token-like` pattern that caused the SHA false positives. That includes `gtm-container-id`, `private-key` and `aws-access-key-id`. These files do not hold only machine data. `status.events.jsonl` stores free-text review and annotation notes. Line 170 holds the annotation "Ready for review (cycle 2: fixed GTM-…)", which contains a four-X container-shaped placeholder. Without the exemption, today's working-tree scan would flag it. A reviewer or agent who pastes a real container ID into a review note would now pass every gate.

`verify-container.ts`'s "scanner still flags a real-looking ID" check calls `scanText()` directly. It cannot see file-selection logic in `main()`, so FR-019's guard would not catch this kind of weakening. A narrower fix is possible: exempt only `cloudflare-token-like` on 40-hex `lane_head` values. Either way, it needs a Charter or Product Owner decision under QDR-004 and QDR-007.

### DRIFT-2: FR-024 recorded as `pass` while its precondition (spike run 2) is pending

**Type**: PUNTED-FR
**Severity**: MEDIUM
**Spec reference**: FR-023 ("run 2 … must be recorded before path 2's instructions are finalised"), FR-024, SC-007, NFR-004, NFR-006
**Evidence**:
- `f56c525..857530d`: acceptance commits record `FR-024=pass` and `FR-023=pending`.
- `docs/spike/preview-spike.md`: "Status: not yet run". Path 2 copy is "provisional".
- `docs/release-checks.md` T048 and T051 say "Not yet run".

**Analysis**: the spec allows implementation to go ahead before run 2, and the deferral is recorded honestly in the evidence docs. The acceptance matrix still marks FR-024 as `pass` when it can only be `pending`. Three measurable criteria (NFR-004, NFR-006 and SC-007) have no evidence, and all three are needed before rehearsals finish on Thu 19 Nov 2026 (C-006). WP11 review cycle 1, Issue 2 asked for a planned date for run 2. Neither the spike doc nor the release checks were given one before approval.

---

## Risk Findings

### RISK-1: CI will fail on the mission PR (`pnpm gates --ci` exits 1)

**Type**: BOUNDARY-CONDITION (gate configuration)
**Severity**: HIGH
**Location**: `.github/workflows/gates.yml` → `pnpm gates --ci` → `scripts/gates.ts:123` adds `--history`
**Trigger condition**: any push or PR of `feat/byo-gtm-container` to GitHub.

**Analysis**: the full-history scan reports 11 `gtm-container-id` findings, all four-X placeholders in blobs this mission introduced:
- 9 × three earlier revisions of `kitty-specs/byo-gtm-container-01M64PAZ/spec.md` (lines 22, 34 and 138 in blobs `0bfc60e`, `96bed7f`, `b76cc9f`)
- 1 × `docs/release-checks.md` blob `b2f5ae5` (the WP11 cycle-1 text, later fixed)
- 1 × `review-cycle-1.md` blob `14248d1` (the reviewer's original text)

WP11 disclosed this in `docs/release-checks.md` ("37 findings, exit 1 … a Product Owner / mission decision"), but the mission merged with it unresolved. `2b85085` cleared only the 28 status-file findings. Local `pnpm gates` passes because it scans only the working tree, which is why the per-WP DoD ("`pnpm gates` passes") was met. C-007 and SC-008 ("all four gates pass on the mission's final commit") are not met for the gate CI enforces, and the PR to `main` will be red. These blobs are in history, so the fix is an allowlist or baseline decision, or a history rewrite before the first push. It needs the Product Owner.

### RISK-2: Implementer and reviewer are the same agent identity on all 11 WPs

**Type**: CROSS-WP-INTEGRATION (process independence)
**Severity**: MEDIUM
**Location**: `tasks/*/review-cycle-*.md` (12 × `reviewer_agent: copilot`); `status.events.jsonl` (59 × `"agent": "copilot"`); "Start WPxx implementation [copilot]" commits
**Trigger condition**: n/a (process)

**Analysis**: no `ReviewerSelfApproval` event was emitted, but no review was evidently independent. The reviews were not rubber stamps: WP11 was rightly rejected for a false "gates: all 4 passed" claim. Still, the two HIGH findings above both sit in exactly the area a same-identity reviewer is least likely to challenge, the gate's own strictness. Separately, fix commit `817a970` edited the reviewer's `review-cycle-1.md` to remove the literal. The edit was harmless, but it changes a review record after the fact, and the original blob still trips the history scan.

### RISK-3: FR-002 (container before first push) has no behavioural test

**Type**: BOUNDARY-CONDITION
**Severity**: LOW
**Location**: `vite.config.ts` (inline head loader); `site/src/pages/thank-you.ts:14` pushes `purchase` on load
**Trigger condition**: a future change makes the loader `defer`/`async`/module, or moves the marker after module scripts.

**Analysis**: today the guarantee is structural: an inline classic script in `<head>` runs before deferred modules. No test asserts that `gtm.start` precedes the first page push, so a regression would pass the whole e2e suite. The thank-you page is exactly where the first push happens on load. A cheap ordering assertion on `window.dataLayer` would close this.

### RISK-4: FR-004 (no-script fallback) untested

**Type**: BOUNDARY-CONDITION
**Severity**: LOW
**Location**: `vite.config.ts` `bodySnippet`
**Trigger condition**: regression in the body marker replacement.

**Analysis**: the code is a near-verbatim carry-over, but no e2e runs with `javaScriptEnabled: false` or asserts the built HTML's `<noscript>` iframe. Ratchet FRs that are "paired" in the spec still need one live check.

### RISK-5: Path 1 copy is inaccurate when no container is built in

**Type**: ERROR-PATH
**Severity**: LOW
**Location**: `site/src/menu/visitor-menu.ts:238`
**Trigger condition**: `data-container-source="none"` (build without `VITE_GTM_CONTAINER_ID`, an Edge Case the spec lists).

**Analysis**: path 1 says "You're using the shop's pre-built container." while the status line correctly says "In use: no container on this build". The two messages contradict each other in a local or preview build. This doesn't affect production.

### RISK-6: Dev server caches the inlined rules

**Type**: ERROR-PATH
**Severity**: LOW
**Location**: `vite.config.ts` `rules ??= buildRulesScript()`
**Trigger condition**: editing `active-container.ts` while `pnpm dev` runs.

**Analysis**: the inlined head loader keeps the old rules until the dev server restarts, while the menu's imported copy hot-reloads. The two can disagree during development. Production builds are unaffected.

---

## Silent Failure Candidates

| Location | Condition | Silent result | Spec impact |
|---|---|---|---|
| `scripts/no-secrets.ts` (`isCoordinationStatusFile`) | any finding in `kitty-specs/*/status.json` or `status.events.jsonl` | skipped, 0 findings | C-002 / FR-019 (DRIFT-1) |
| `vite.config.ts` glue, `removeItem` `catch (e) {}` | storage throws on remove | bad value stays; it is re-rejected on every load | none; it falls back correctly each time |
| `banner.ts` `readContainerState` | `data-container-source="visitor"` with an unparseable ID | reports `shop` while a visitor container may be loaded | unreachable today (the loader only sets a checked ID) |

All other new `catch` blocks (`visitor-storage.ts`, `parseSavedContainer`) return explicit `unavailable` or `null` values that the callers handle and show to the visitor. That is correct.

---

## Security Notes

| Finding | Location | Risk class | Recommendation |
|---|---|---|---|
| Gate exemption covers all patterns, including private and AWS keys, in files that hold free text | `scripts/no-secrets.ts` | secret-scan bypass | Narrow it to the specific false-positive pattern, or revert and allowlist explicitly (DRIFT-1) |
| A visitor container runs arbitrary JS on `demo.quadrano.com` | by design (FR-006) | self-inflicted script injection, social engineering | Accepted by the Product Owner (spec, Assumptions). Mitigated by FR-009, FR-011 and FR-013; verified. No issue found. |
| Container ID placed in a URL | `vite.config.ts` glue | URL injection | Safe: `CONTAINER_ID_PATTERN` is anchored with no `m` flag, checked before use; the banner uses `textContent` |
| Address-based container choice | `site/src/container/**` | open-redirect-style link attack | Blocked three ways: a lint override, a build-time regex guard on the inlined code, and `address.spec.ts`. Verified. |
| Sign-in cookie exposure on the quadrano.com parent domain | spec Assumptions | cookie scope | Accepted by the Product Owner on 2026-10-29; not re-checked here |

---

## Final Verdict

**FAIL**

### Verdict rationale

The shipped site code is a faithful and well-tested delivery of the spec. FR-001 to FR-022 are implemented as specified, push shapes are tested against the contract rather than the code, the address can't choose a container, and e2e passes 192/192. The verdict is FAIL because of two HIGH findings, neither of which is in the shop's runtime code:
1. **DRIFT-1**: the no-secrets gate was broadened after merge, outside any WP and without an amendment, which contradicts locked constraint C-002.
2. **RISK-1**: `pnpm gates --ci`, the gate CI enforces, exits 1 on 11 history findings this mission introduced, so C-007 and SC-008 are not met and the PR to `main` cannot go green.

Gate 4 also fails because `issue-matrix.json` is missing.

To clear the blockers: (a) a Product Owner decision on the history findings and the status-file exemption, recorded under QDR-004 and QDR-007, with the exemption narrowed or reverted; (b) `pnpm gates --ci` at exit 0; (c) regenerate the issue matrix.

### Open items (non-blocking)

- DRIFT-2: correct FR-024 to `pending` in the acceptance matrix, then record spike run 2, NFR-004 (Lighthouse on the Pages preview) and NFR-006 / SC-007 (rehearsal) before Thu 19 Nov 2026, with a planned date as WP11 cycle-1 Issue 2 asked.
- RISK-2: use a different reviewer identity than the implementer on future missions.
- RISK-3 and RISK-4: add a `dataLayer` ordering assertion (FR-002) and a JS-disabled check (FR-004).
- RISK-5: path 1 copy in the `none` state.
- RISK-6: dev-server rules cache.
- Fix `meta.json` `baseline_merge_commit`, which points mid-mission at `ebbc191`.

## Retrospective Reminder

The canonical post-merge sequence is: **mission review → author or verify the retrospective → surface findings**.

The retrospective record exists at `kitty-specs/byo-gtm-container-01M64PAZ/retrospective.yaml` (flattened location; authored by the runtime on 2026-10-30, commit `555e3e7`). Nothing is at `.kittify/missions/01M64PAZQB6Q2VRYWRQN3R6V59/`, which is expected after flattening.

- `spec-kitty retrospect summary`: cross-mission aggregation (read-only)
- `spec-kitty agent retrospect synthesize --mission byo-gtm-container-01M64PAZ`: inspect proposals (dry-run)
- `spec-kitty agent retrospect synthesize --mission byo-gtm-container-01M64PAZ --apply`: apply proposals (mutates)

Suggested inputs for the retrospective: the gate-strictness findings (DRIFT-1 and RISK-1), and the fact that WP DoDs said "`pnpm gates` passes" while CI runs `pnpm gates --ci`.

---

## Addendum: remediation on 2026-10-30

The Product Owner asked for every fixable finding to be fixed in one pass, and approved the Charter 1.1.1 gate rule. Re-check on the remediated tree: `pnpm gates --ci` exit 0 (`no-secrets: 0 findings`); `node scripts/no-secrets.ts --history` exit 0; `pnpm verify:container` 12/12 ok; `pnpm verify:scenarios` 8/8 ok; `pnpm test:e2e` 196 passed.

| Finding | Outcome | Commit |
|---|---|---|
| DRIFT-1: status-file exemption | **Fixed.** Exemption reverted. Charter 1.1.1: all-X container IDs are placeholders, and only 40-hex `"lane_head"` values are skipped by the token pattern. New `verify:container` checks fail if `no-secrets.ts` skips a file by path (shown failing against `2b85085`'s version) and confirm that near-placeholders and token-shaped `lane_head` values are still reported. | `7791373` |
| RISK-1: `pnpm gates --ci` exit 1 | **Fixed.** Exits 0 with no history rewrite. | `7791373` |
| Gate 4: issue matrix missing | **Fixed.** `#4` recorded as `fixed` via `spec-kitty agent issue-verdict`. | `b36189d` |
| DRIFT-2: FR-024 `pass` | **Fixed in the record.** FR-024 is `pending` (`overall_verdict: pending`); the spike doc carries the C-006 deadline. Spike run 2, NFR-004 and NFR-006 / SC-007 **remain open** (Product Owner steps). | `8b3b7d3`, this commit |
| RISK-3: FR-002 untested | **Fixed.** `e2e/head-loader.spec.ts`, shop and visitor states; mutation-checked. | `06b0cd1` |
| RISK-4: FR-004 untested | **Fixed.** JS-disabled checks on 5 pages, with and without a saved ID. | `06b0cd1` |
| RISK-5: path 1 copy in `none` state | **Fixed.** New message, contract updated, checked against a no-ID build. | `6f8e28a` |
| RISK-6: dev-server rules cache | **Fixed.** Cached for `vite build` only; checked against the dev server. | `dcd0072` |
| Baseline in `meta.json` | **Fixed.** `baseline_merge_commit` is now `a3c4f96`. | this commit |
| RISK-2: same implementer and reviewer identity | **Not fixable after the fact.** Use an independent reviewer on future missions. | — |

**Verdict after remediation: PASS WITH NOTES.** No blocking finding remains. The open notes are spike run 2, NFR-004 and NFR-006 / SC-007 (Product Owner, before Thu 19 Nov 2026) and RISK-2 (process).
