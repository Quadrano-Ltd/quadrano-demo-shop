---
work_package_id: WP06
title: 'e2e: off state, switch and link'
dependencies:
- WP05
requirement_refs:
- SC-002
- SC-003
- SC-004
- FR-004
- FR-005
- FR-006
- FR-011
- FR-012
- C-002
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
subtasks:
- T032
- T033
- T034
- T035
- T036
- T037
- T038
phase: Phase 4 - Proof
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: e2e/
create_intent:
- e2e/results-setting.spec.ts
execution_mode: code_change
model: ''
owned_files:
- e2e/results-setting.spec.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP06 – e2e: off state, switch and link

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission on-page-results-mirror-01M78JHF`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Prove everything about the Results view that is a "nothing changed" claim, each with its control.

| Check | Proves | Its control |
|---|---|---|
| View off: Console methods are native on all 5 pages; same requests | FR-005, SC-002 | view on, same page: not native |
| Switch and link each leave the view on after a reload and on the next page; off returns to native | FR-004, FR-006 | — |
| 3 links with `results=on` beside a container-shaped parameter leave the container as it was | C-002, SC-004 | the same links turn the view on |
| Switch, link, menu and rows add 0 entries to the data layer | FR-012, SC-003 | a playground press adds its 2 |
| Storage and the request list are the same before and after 7 results are showing | FR-011 | 7 rows are showing |

**Done when**: `pnpm exec playwright test e2e/results-setting.spec.ts --project=chromium --repeat-each=3` passes; every ratchet test has its control in the same test; `pnpm gates` passes.

## Context & Constraints

- **Read first**: the "Checks" tables in `contracts/console-capture.md` and `contracts/results-view.md`; spec User Stories 2 and 3 and the "No-op passable?" column of the requirements table; `data-model.md` (the setting's state diagram); `research.md` R-03; `e2e/address.spec.ts` (how crafted links are built today).
- **Why controls matter here**: FR-005, FR-011 and FR-012 are ratchets. A build with no Results view at all would pass "Console is native" and "0 pushes". The spec pairs each with a check that must differ. A test without its control is not done.
- **Helpers**: import from `e2e/results-helpers.ts` (WP05): `serveSnippetAsGtm`, `openWithResults`, `waitForBanner`, `consoleIsNative`, `rowCount`, `PLAYGROUND_LABELS`, `RESULTS_VIEW_KEY`. Import `test`, `expect`, `openMenu`, `pushedEntries`, `PAGES`, `SHOP_CONTAINER_ID`, `STORAGE_KEY`, `visitorContainerId` from `e2e/fixtures.ts`. Don't edit either file. If a helper is missing, add it locally in this spec and note it.
- **Secrets (QDR-004)**: build every container ID at run time. No ID-shaped literal.
- **Fixed names from WP03**: `#results-switch`, `#results-switch-note`, `section.results`, `li.results__row`, `details.results__result`, `summary.results__header`.
- **The setting**: `sessionStorage['demo-shop:results-view'] === 'on'`. Per tab. The link parameter is `results`, and only the value `on` counts.
- **The `gtm` fixture** records the `id` of every `gtm.js` request in `gtm.ids`. Tests that need that record must **not** call `serveSnippetAsGtm` (it answers the request before the recorder sees it). Tests that need results showing must call it.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP06 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T032 – Off state on 5 pages, with its control

**Purpose**: FR-005, SC-002, User Story 2 scenario 1. The stage path doesn't change.

**Steps**:

1. Create `e2e/results-setting.spec.ts`. A local helper collects request URLs for one navigation:

   ```ts
   async function requestsFor(page: Page, url: string): Promise<string[]> {
     const seen: string[] = [];
     const onRequest = (request: Request): void => { seen.push(request.url()); };
     page.on('request', onRequest);
     await page.goto(url);
     await page.waitForLoadState('load');
     page.off('request', onRequest);
     return seen;
   }
   ```

2. For each path in `PAGES`, one test:
   - **Off**: `requestsFor(page, path)`. Assert:
     - `consoleIsNative(page)` is `true`
     - `<html>` has no `data-results-view` and no `data-results-storage`
     - `'__demoShopResults' in window` is `false`
     - `sessionStorage.getItem(RESULTS_VIEW_KEY)` is `null`
     - `#results-status` has count 0
   - **On, same page (the control)**: `requestsFor(page, withResults(path))`. Assert `consoleIsNative(page)` is `false` and the attribute is `on`.
   - **Same requests**: after removing the document URL from each list (they differ by the query), the two lists hold the same URLs. Compare as sorted arrays. This shows the view adds no request; with the view off the page makes the same requests as with it on, and the on build adds none to today's.
   - Also assert every URL in the off list is either same-origin or the one `gtm.js` request, as `e2e/container.spec.ts` already expects.

3. The product page needs a product ID (`/product/` falls back to the hero product; check how `PAGES` is used in other specs and do the same). The thank-you page with no order shows its empty state; that is fine for this check.

**Files**: `e2e/results-setting.spec.ts` (new)

**Validation**:
- [ ] 5 tests pass.
- [ ] Each contains both the off assertions and the on control.

**Edge cases**:
- Hashed asset names are the same in both runs (one build), so the URL lists compare exactly.
- Run the off half first, in a fresh context, so no stored setting can leak into it.

### Subtask T033 – Switch on and off

**Purpose**: FR-004, User Story 3 scenario 1, User Story 2 scenario 2, User Story 1 scenario 5.

**Steps**:

1. **On by switch**: `page.goto('/')`, open the menu. Assert the switch is unchecked, enabled, has `role="switch"`, and is described by the note `The page reloads when you change this.` Check it and wait for the reload (`page.waitForEvent('load')` started before the click, or `expect(html).toHaveAttribute('data-results-view', 'on')`). Assert:
   - the address has no `results` parameter (the switch doesn't add one)
   - `sessionStorage` holds `on`
   - after opening the menu, the switch is checked
2. **Still on, on the next page, and empty**: with `serveSnippetAsGtm` in place, press `add_to_cart` (1 row). Go to `/basket/` by clicking the header's Basket link (a real navigation in the same tab). Assert the attribute is `on` and, after `waitForBanner` and opening the menu, 0 rows and `No output yet`.
3. **Off by switch**: uncheck. After the load, assert `consoleIsNative` is `true`, the attribute is gone, `sessionStorage.getItem(RESULTS_VIEW_KEY)` is `null`, and the pathname is still `/basket/`.
4. **A new tab starts off**: `context.newPage()` while the first tab has the view on; `goto('/')`; assert the view is off there. (Decision `DM-01M78NYDDTDCEGEP0S4BDQDNKM`: this tab only.)
5. **With the view off, the section holds only the heading, the switch and the note**: assert `section.results` contains no `ul.results__list` and no `p.results__empty`.

**Files**: `e2e/results-setting.spec.ts`

**Validation**:
- [ ] All five behaviours asserted.
- [ ] No fixed delays; every wait is on a state.

### Subtask T034 – The link

**Purpose**: FR-006, User Story 3 scenario 2, and the link edge cases.

**Steps**:

1. **On as the switch does**: `goto('/?results=on')`. Assert the attribute is `on`, `sessionStorage` holds `on`, and the switch is checked. Navigate to `/checkout/` by its header link: still on, and the address there has no `results` parameter (internal links are path-only, research R-03).
2. **Off from a link-opened page**: on `/?results=on`, uncheck the switch. Assert the new address has no `results` parameter, the view is off, and `consoleIsNative` is `true`. Then `page.goBack()` must not land on an address that turns the view on again: assert the view is off, or that there is no earlier entry for this tab. (WP03 uses `location.replace` for this.)
3. **Other values change nothing**. Table-driven, each from a fresh context with the view off:

   | Address | Expect |
   |---|---|
   | `/?results=off` | off |
   | `/?results=` | off |
   | `/?results` | off |
   | `/?results=ON` | off |
   | `/?results=1` | off |
   | `/?xresults=on` | off |
   | `/?results=on` | **on** (the control) |

   And from a context with the view already on by switch: `/?results=off` leaves it **on** ("an unrecognised value leaves the view as it was").
4. **Beside `?scenario=`**: `goto('/checkout/?scenario=missing-value&results=on')` and `goto('/checkout/?results=on&scenario=missing-value')`. In both, the view is on **and** the scenario control shows `missing-value` (`#scenario-select` has that value). Then with `?results=on` only: the address gains `scenario=correct` as it does today, and still carries `results=on`.

**Files**: `e2e/results-setting.spec.ts`

**Validation**:
- [ ] The value table includes its control row.
- [ ] Scenario behaviour matches today's (compare with how `e2e/playground.spec.ts` or `e2e/smoke.spec.ts` read the scenario).

### Subtask T035 – 3 crafted links never change the container

**Purpose**: C-002, SC-004, User Story 3 scenario 3, byo-gtm-container FR-013.

**Steps**:

1. Build one visitor-shaped ID at run time: `const crafted = visitorContainerId('LINK01');`
2. At least 3 links, each combining `results=on` with a container-shaped parameter. Reuse the parameter names `e2e/address.spec.ts` already uses for crafted links, and vary the position:

   ```ts
   const links = [
     `/?results=on&gtm=${crafted}`,
     `/?gtm_id=${crafted}&results=on`,
     `/?results=on&container=${crafted}#${crafted}`,
   ];
   ```

3. For each link, in a fresh context (this test must **not** call `serveSnippetAsGtm`, so the recorder sees the request):
   - `gtm.ids` equals `[SHOP_CONTAINER_ID]`: exactly one request, for the shop's container
   - `<html data-container-source="shop">`, and no `data-visitor-container`
   - `localStorage.getItem(STORAGE_KEY)` is `null`: nothing was saved
   - **control**: `<html data-results-view="on">`: the same link did turn the view on
4. Add one more case: a visitor has saved their own container (use `seedSaved` and `savedValue` from `e2e/fixtures.ts`), then opens `/?results=on`. Assert `gtm.ids` is the visitor's ID only, the saved value is unchanged, and the view is on. The link neither sets nor clears the container.

**Files**: `e2e/results-setting.spec.ts`

**Validation**:
- [ ] 0 of 3 links change the container; all 3 turn the view on.
- [ ] No ID-shaped literal in the file (`pnpm gates` no-secrets would catch one).

### Subtask T036 – Storage blocked

**Purpose**: The "browser storage unavailable" edge case and the contract's switch states.

**Steps**:

1. A local helper, modelled on `blockStorage` in `e2e/fixtures.ts`, that makes `window.sessionStorage` throw before any page script:

   ```ts
   async function blockSessionStorage(page: Page): Promise<void> {
     await page.addInitScript(() => {
       Object.defineProperty(window, 'sessionStorage', {
         configurable: true,
         get() { throw new DOMException('blocked', 'SecurityError'); },
       });
     });
   }
   ```

2. **View off, storage blocked**: `goto('/')`, open the menu. Assert the switch is unchecked and **disabled**, and the note reads: `This browser blocks site storage, so this view can't be remembered. Open the shop from the talk's link to see it on one page.` Assert `consoleIsNative` is `true` and no page error was thrown (`page.on('pageerror', …)` collected none).
3. **Link, storage blocked**: `goto('/?results=on')`. Assert the attribute is `on`, `data-results-storage="unavailable"`, `window.__demoShopResults.storage` is `'unavailable'`, the switch is checked and **enabled**.
4. **On for this page only**: from there, click the header's Basket link. On `/basket/` the view is off (nothing was remembered and the link parameter is gone).
5. **Off still works**: back on `/?results=on` with storage blocked, uncheck the switch. Assert the address loses `results` and the view is off.
6. The basket and order stores also use storage. If blocking `sessionStorage` breaks a page for reasons unrelated to this mission, keep to `/` and `/basket/` and note what you saw; don't change shop code.

**Files**: `e2e/results-setting.spec.ts`

**Validation**:
- [ ] The four states in WP03's table are each asserted somewhere in this file (two here, two in T033 and T034).

### Subtask T037 – The view makes 0 pushes

**Purpose**: FR-012, SC-003, User Story 3 scenario 4.

**Steps**:

1. Use `pushedEntries(page)` (it ignores `gtm.*` entries). Take a count before and after each action:

   | Action | Expected change |
   |---|---|
   | open the menu | 0 |
   | close the menu | 0 |
   | expand a result row | 0 |
   | collapse it | 0 |
   | **press `add_to_cart` (the control)** | **2** (`{ ecommerce: null }` then the event, as `e2e/playground.spec.ts` expects) |

   Rows are needed for the expand and collapse steps, so this test calls `serveSnippetAsGtm` and presses once first; take the "before" counts after that press.

2. Actions that reload the page can't be compared across the reload. Compare page loads instead:

   | Page load | Expected `pushedEntries` length |
   |---|---|
   | `/` with the view off | baseline `n` (expect 0 on the listing page) |
   | `/` after turning the switch on (reloaded) | `n` |
   | `/?results=on` in a fresh context | `n` |
   | `/` after turning the switch off (reloaded) | `n` |

3. Put the control in the same test as the zero checks.

**Files**: `e2e/results-setting.spec.ts`

**Validation**:
- [ ] Every row of both tables is asserted.
- [ ] The control asserts exactly 2.

### Subtask T038 – Storage and requests unchanged with 7 results showing

**Purpose**: FR-011. Copies are kept for the life of the page and never stored or sent.

**Steps**:

1. `serveSnippetAsGtm`, `openWithResults`, `waitForBanner`, open the menu.
2. Snapshot **before**:

   ```ts
   const snapshot = () => page.evaluate(() => ({
     session: Object.fromEntries(Object.entries(window.sessionStorage)),
     local: Object.fromEntries(Object.entries(window.localStorage)),
     cookie: document.cookie,
   }));
   ```

   Also take `context.cookies()`.
3. Start collecting `page.on('request')` URLs.
4. Press all 7 playground buttons, waiting for the row count after each.
5. **Control**: `rowCount(page)` is 7.
6. Assert:
   - the storage snapshot equals the one from step 2 (the playground changes neither store)
   - `context.cookies()` is unchanged
   - the request list collected during the presses is empty
   - `sessionStorage` holds exactly `on` under `RESULTS_VIEW_KEY`, and no stored value anywhere contains the text of the first row's header (read the header from the page, then search the snapshot's values for it)
7. Reload the page: 0 rows. Results don't survive a reload (data-model.md: "Exists only while the page is open").

**Files**: `e2e/results-setting.spec.ts`

**Validation**:
- [ ] Control and all four assertions present.
- [ ] Whole file: `pnpm exec playwright test e2e/results-setting.spec.ts --project=chromium --repeat-each=3` passes.

---

## Definition of Done

- [ ] Every row of the Objectives table is covered, each with its control in the same test.
- [ ] The four switch states are asserted.
- [ ] No ID-shaped literal; no fixed delays.
- [ ] `--repeat-each=3` passes; the rest of `pnpm test:e2e` still passes.
- [ ] `pnpm gates` passes.
- [ ] Only `e2e/results-setting.spec.ts` changed.
- [ ] `spec-kitty agent tasks mark-status T032 T033 T034 T035 T036 T037 T038 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A ratchet test with no control | Controls listed per subtask; reviewer checks each test |
| A stored setting leaking between tests | Playwright gives each test a fresh context; the off half runs first within a test |
| `serveSnippetAsGtm` used where the recorder is needed | Stated in Context; T035 doesn't call it |
| Reload timing | Wait on `data-results-view` or `consoleIsNative`, not on time |
| Blocking `sessionStorage` breaks unrelated shop code | Keep to `/` and `/basket/`; record, don't fix |

## Review Guidance

- For each test named "…unchanged", "…0 pushes" or "…native", find its control. If you can't, reject.
- Delete the capture script's wrappers in a scratch build in your head: which tests would still pass? Only the off halves should.
- Search the file for `GTM-`. Expect no hits.
- Run with `--repeat-each=3`.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
