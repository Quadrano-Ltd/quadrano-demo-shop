---
work_package_id: WP07
title: 'e2e: offline build, accessibility and layout'
dependencies:
- WP05
requirement_refs:
- FR-009
- FR-013
- NFR-001
- NFR-002
- NFR-003
- SC-005
- SC-007
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
subtasks:
- T039
- T040
- T041
- T042
- T043
- T044
phase: Phase 4 - Proof
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: e2e/
create_intent:
- e2e/results-offline.spec.ts
execution_mode: code_change
model: ''
owned_files:
- e2e/results-offline.spec.ts
- e2e/a11y.spec.ts
- e2e/layout.spec.ts
- playwright.config.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP07 – e2e: offline build, accessibility and layout

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

| Check | Proves |
|---|---|
| 7 of 7 playground pushes give a row equal to the Console group, in the offline build | FR-009, NFR-003 |
| In the offline build the banner is seen although the snippet runs in the head | research R-01 |
| axe reports 0 violations with the view on, empty and with results | NFR-002 |
| The switch and every row work by keyboard alone | NFR-002 |
| The status region holds each new header and focus doesn't move, for 7 of 7 presses | FR-013, SC-007 |
| 0 px horizontal overflow at 360 px with at least 5 results, at least 2 expanded | NFR-001, SC-005 |

**Done when**: `pnpm test:e2e` passes in full 3 times running; the new offline suite runs only in the `offline` project; existing cases in `a11y.spec.ts` and `layout.spec.ts` are unchanged; `pnpm gates` passes.

## Context & Constraints

- **Read first**: `contracts/results-view.md` ("Checks"); `research.md` R-01 and R-09; spec User Story 4; `e2e/offline-mode.spec.ts` (how the offline project seeds a snippet and blocks the network); the current `e2e/a11y.spec.ts` and `e2e/layout.spec.ts`; `playwright.config.ts`.
- **Helpers**: import from `e2e/results-helpers.ts` (WP05): `serveSnippetAsGtm`, `openWithResults`, `waitForBanner`, `recordConsole`, `expectedResults`, `readRow`, `rowCount`, `PLAYGROUND_LABELS`, `RESULTS_VIEW_KEY`. From `e2e/snippets.ts`: `SNIPPET_BEFORE_STEP8`, `OFFLINE_SNIPPET_KEY`. Don't edit those files.
- **Extend, don't change**: add new tests and new matrix cases to `a11y.spec.ts` and `layout.spec.ts`. Leave every existing test as it is, including the existing `PLAYGROUND_LABELS` constant in `a11y.spec.ts` (import WP05's under another name, or keep using the local one).
- **Expected text comes from the run** (plan IC-04): the offline verbatim test builds its expectations from the Console arguments of the same run, as WP05's does.
- **Fixed names from WP03**: `section.results`, `#results-switch`, `li.results__row`, `details.results__result`, `summary.results__header`, `pre.results__pushed`, `p.results__empty`, `#results-status`.
- **Two servers**: production build on port 4173 (`chromium` project), offline build on port 4174 (`offline` project). The offline build has the Offline mode panel and the boot step; the production build has neither.
- **Secrets (QDR-004)**: no ID-shaped literal.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP07 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T039 – `playwright.config.ts`: route the offline suite

**Purpose**: The offline Results cases must run against the offline build only.

**Steps**:

1. In the `chromium` project, add the new file to `testIgnore`:

   ```ts
   testIgnore: /container\.spec\.ts|offline-mode\.spec\.ts|results-offline\.spec\.ts/,
   ```

2. In the `offline` project, add it to `testMatch`:

   ```ts
   testMatch: /offline-mode\.spec\.ts|results-offline\.spec\.ts/,
   ```

3. Change nothing else: not the servers, ports, env or the `container-x10` project.
4. Check the regexes: `results\.spec\.ts` and `results-setting\.spec\.ts` must still run in `chromium` and not in `offline`. `results-offline\.spec\.ts` doesn't match `results\.spec\.ts` because of the `-offline` before `.spec`; confirm with `pnpm exec playwright test --list`.

**Files**: `playwright.config.ts`

**Validation**:
- [ ] `pnpm exec playwright test --list --project=offline` lists `offline-mode.spec.ts` and `results-offline.spec.ts` only.
- [ ] `pnpm exec playwright test --list --project=chromium` lists neither of those and does list `results.spec.ts` and `results-setting.spec.ts`.

### Subtask T040 – `results-offline.spec.ts`

**Purpose**: FR-009 and NFR-003 on the offline path, and the proof that the capture script runs before the offline boot step (R-01).

**Steps**:

1. Create `e2e/results-offline.spec.ts`. As in `offline-mode.spec.ts`, abort every non-local request in `beforeEach`, so GTM never loads and the only runtime on the page is the stored snippet. Copy the small `abortNonLocal` helper locally; don't export it from the other spec.
2. A local seed helper:

   ```ts
   /** Store the snippet and the Results setting, then load `path` in the same tab. */
   async function seed(page: Page, path = '/'): Promise<void> {
     await page.goto('/');
     await page.evaluate(
       ([snippetKey, snippet, viewKey]) => {
         window.sessionStorage.setItem(snippetKey, snippet);
         window.sessionStorage.setItem(viewKey, 'on');
       },
       [OFFLINE_SNIPPET_KEY, SNIPPET_BEFORE_STEP8, RESULTS_VIEW_KEY] as const,
     );
     await page.goto(path);
   }
   ```

3. **Banner seen from the head.** After `seed(page)`, assert straight away, with no waiting helper:

   ```ts
   expect(await page.evaluate(() => window.__demoShopResults?.bannerSeen)).toBe(true);
   ```

   In the offline build the snippet runs synchronously in `<head>`, before any module. If the capture script were emitted after the boot step, this would be `false`. Also read the built page (`await (await page.request.get('/')).text()`) and assert the index of the text `demo-shop:results-view` is smaller than the index of the marker `quadrano-demo-shop:offline-mode`.

4. **7 verbatim rows.** The same loop as WP05's first test: for each label, `recordConsole` around the press, wait for the row count, compare `readRow(page, 0)` with `expectedResults(calls)[0]`.
5. **Control, no snippet stored.** Set only the Results setting, load `/`, open the menu: `p.results__empty` reads the "hasn't loaded" message, and pressing a button adds 0 rows. This is the paired state for step 3.
6. **By link in the offline build.** Store only the snippet, then `goto('/?results=on')`: the view is on, the banner is seen, a press adds 1 row.
7. **Still on after moving pages.** From a seeded `/`, go to `/basket/` by the header link: the attribute is `on`, the banner is seen again (the boot step runs on every page), 0 rows.

**Files**: `e2e/results-offline.spec.ts` (new)

**Validation**:
- [ ] `pnpm exec playwright test --project=offline` passes.
- [ ] 7 of 7 rows equal their Console groups.
- [ ] No expected runtime text typed in the file.

**Edge cases**:
- The offline build keeps the GTM loader; with the network blocked its request is aborted and nothing else happens.
- If `bannerSeen` is `false` in step 3, the fault is in the head order (WP02), not here. Report it; don't add a wait to hide it.

### Subtask T041 – `a11y.spec.ts`: axe with the view on

**Purpose**: NFR-002: 0 violations with the view on, both empty and with results.

**Steps**:

1. Add a new `test.describe('axe with the Results view on', …)`. Keep the existing matrix as it is.
2. For each path in `PAGES`, three cases, all with the menu open, all using the existing `expectNoViolations(page)`:

   | Case | Setup |
   |---|---|
   | on, empty, Quadrano not loaded | `openWithResults(page, path)` with the default empty `gtm.js` stub; the "hasn't loaded" message shows |
   | on, empty, Quadrano loaded | `serveSnippetAsGtm`, `openWithResults`, `waitForBanner`; `No output yet` shows |
   | on, with results | as above, then press 5 playground buttons, expand the first 2 rows |

3. One more case on `/`: view **off**, menu open (the Results section with only its switch). The existing matrix covers this implicitly once WP03 lands, but name it so a failure points at the right thing.
4. One more case on `/`: storage blocked for `sessionStorage` (disabled switch and its note). Use an init script as `blockStorage` does for `localStorage`.
5. Before each axe run, assert the state you meant to reach (row count, or the empty message), so a test can't pass on the wrong state.

**Files**: `e2e/a11y.spec.ts`

**Validation**:
- [ ] 5 × 3 + 2 new cases pass with 0 violations.
- [ ] `git diff e2e/a11y.spec.ts` shows additions only.

**Edge cases**:
- If axe reports a violation, the fix belongs in WP03's files (`results.ts`, `styles.css`). Report it with the rule ID and node; a small, recorded out-of-map fix is acceptable if WP03 is already merged, otherwise send it back.
- Common ones to expect: a `summary` with too little contrast, a switch with no accessible name, a `pre` that can't be scrolled by keyboard (it shouldn't scroll at all: it wraps).

### Subtask T042 – Keyboard, status region and focus

**Purpose**: NFR-002 (100% of the view's controls by keyboard), FR-013 and SC-007 (announced, focus stays).

**Steps**:

1. **Keyboard reach.** New test, view on with 3 results:
   - Open the menu with Enter on the toggle, as the existing keyboard test does.
   - Tab until `#results-switch` is focused (cap the loop, as the existing test does). Assert it shows a focus ring (reuse the existing outline or box-shadow check).
   - Keep tabbing: each `summary.results__header` receives focus in list order.
   - On a focused summary, Enter opens the row (`details` gains `open`); Space closes it. Do this for 2 rows and assert the others don't change.
   - Escape from a focused summary closes the menu and returns focus to the toggle, as it does from any other control.
2. **Switch by keyboard.** View off: focus `#results-switch`, press Space. The page reloads with the view on. Then focus it again and press Space: the view is off. No pointer events anywhere in this test.
3. **Announced, focus stays, 7 of 7.** View on, runtime loaded, menu open. For each of the 7 playground buttons:
   - `button.focus()`; press Enter.
   - Wait for the row count to rise.
   - Assert `#results-status` text equals the new row's header (read both from the page; nothing typed).
   - Assert `document.activeElement` is still that button.

   ```ts
   const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
   expect(focused).toBe(label);
   ```

4. **The region's place and role.** Assert `#results-status` has `role="status"`, is a descendant of `.visitor-menu-host`, and is **not** a descendant of `#visitor-menu`.
5. **Announced with the menu closed.** View on, runtime loaded, menu never opened: on the product page press **Add to basket**. Assert `#results-status` becomes non-empty. Focus is still on the Add to basket button.
6. **Its own region.** After a playground press, the layout's live region (`#app > p.visually-hidden[role="status"]`) reads `Pushed <label>` and `#results-status` reads the header. Both hold their own message; neither overwrote the other (R-09).

**Files**: `e2e/a11y.spec.ts`

**Validation**:
- [ ] 7 of 7 presses: status equals the header and focus is unchanged.
- [ ] Every control in `section.results` was reached and operated by keyboard.

### Subtask T043 – `layout.spec.ts`: 360 px with results

**Purpose**: NFR-001 and SC-005.

**Steps**:

1. The file already sets the viewport to 360 × 740. Add a new loop over `PAGES`, leaving the existing loops as they are:

   ```ts
   for (const path of PAGES) {
     test(`no horizontal overflow ${path} with the Results view on and 5 results`, async ({ page }) => {
       await serveSnippetAsGtm(page);
       await openWithResults(page, path);
       await waitForBanner(page);
       await openMenu(page);
       // press 5 buttons, waiting for the row count each time
       // expand rows 0 and 1
       const overflow = await page.evaluate(
         () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
       );
       expect(overflow).toBeLessThanOrEqual(0);
     });
   }
   ```

   Include `purchase · 3 · Wrong-case key` among the 5: it has the longest lines.

2. Assert the state before measuring: at least 5 rows, at least 2 with `open`.
3. **The panel itself.** One test on `/`: no element inside `#visitor-menu` is wider than the panel's client width:

   ```ts
   const widest = await page.evaluate(() => {
     const panel = document.querySelector('#visitor-menu');
     if (panel === null) return null;
     return { scroll: panel.scrollWidth, client: panel.clientWidth };
   });
   expect(widest?.scroll).toBeLessThanOrEqual(widest?.client ?? 0);
   ```

   The page can have 0 overflow while the panel scrolls sideways inside itself; this catches that.

4. **Very long text** (spec, Edge Cases). One test: with the view on, write one group in the runtime's shape whose header, line and pushed value each hold 400 characters with no spaces (use a neutral marker such as `?`, as WP05 does). Expand the row. Assert both measurements above are still within bounds.
5. **Empty states at 360 px.** One test on `/`: view on, Quadrano not loaded; the long "hasn't loaded" message wraps; overflow is 0.
6. **Last row reachable.** With 5 results, `scrollIntoViewIfNeeded()` on the last row's summary, then `toBeInViewport()`, as the existing test does for the last playground button.

**Files**: `e2e/layout.spec.ts`

**Validation**:
- [ ] 5 page cases plus the 4 single cases pass.
- [ ] `git diff e2e/layout.spec.ts` shows additions only.

### Subtask T044 – Full run, flake check and evidence

**Purpose**: The suite is only evidence if it is steady.

**Steps**:

1. If browsers aren't installed on this machine: `pnpm exec playwright install chromium` (by hand, once; see `AGENTS.md`).
2. Run `pnpm test:e2e` three times in a row. Record for each run: total passed, duration, and any failure with its test name.
3. If a test fails once in three, it is a flake. Find the cause (almost always a wait on time or on the wrong state) and fix it in the test. Don't add retries; `playwright.config.ts` has `retries: 0` on purpose.
4. If the cause is in shop code, report it against the owning WP with the failing assertion.
5. Record in the Activity Log: the three run summaries, the number of new tests this WP added per file, and the count of tests in the `offline` project.
6. `pnpm gates` passes.

**Validation**:
- [ ] 3 of 3 full runs green.
- [ ] No `test.skip`, `test.fixme` or `retries` added anywhere.

---

## Definition of Done

- [ ] `results-offline.spec.ts` runs in the `offline` project only and passes.
- [ ] Offline: banner seen from the head; 7 of 7 verbatim rows; the no-snippet control.
- [ ] axe: 0 violations in every new case.
- [ ] Keyboard: switch and rows; 7 of 7 announced with focus unchanged.
- [ ] 360 px: 0 px overflow on 5 pages with 5 results and 2 expanded; long text wraps.
- [ ] Existing tests in the two extended specs unchanged.
- [ ] 3 full runs recorded; `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T039 T040 T041 T042 T043 T044 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Offline suite also runs in `chromium` against the wrong server | T039's `--list` checks |
| A wait hides a wrong head order | T040 step 3 asserts with no wait |
| Existing matrices changed | Additions only; reviewer reads the diff |
| axe run on the wrong state | Assert the state before each run |
| Page has 0 overflow but the panel scrolls sideways | T043 step 3 measures the panel |
| Flakes | 3 full runs; no retries |

## Review Guidance

- `git diff` for `a11y.spec.ts` and `layout.spec.ts` must show additions only.
- Run `pnpm exec playwright test --list` and check which project each new file lands in.
- Run `pnpm test:e2e` yourself, at least once in full.
- In T042's 7-press test, check that both the header and the focused element are read from the page.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
