---
work_package_id: WP10
title: 'e2e: accessibility and phone layout'
dependencies:
- WP06
- WP07
requirement_refs:
- FR-020
- FR-021
- NFR-002
- NFR-003
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T043
- T044
- T045
- T046
phase: Phase 4 - Verification
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: e2e/
create_intent:
- e2e/a11y.spec.ts
- e2e/layout.spec.ts
execution_mode: code_change
model: ''
owned_files:
- e2e/a11y.spec.ts
- e2e/layout.spec.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP10 – e2e: accessibility and phone layout

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission byo-gtm-container-01M64PAZ`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

- **NFR-002**: axe reports **0 violations** on every page with the menu open and closed, with and without the banner (5 × 2 × 2 = 20 scans); 100% of menu, banner and playground controls work by keyboard alone.
- **FR-020**: the toggle is a real button with a visible label and `aria-expanded`; Escape closes and returns focus to the toggle; opening moves focus into the menu.
- **NFR-003 / FR-021**: at 360 px wide, every page, menu open and closed, banner shown: 0 px horizontal overflow, every control reachable.
- **T046**: the whole `pnpm test:e2e` suite (WP07 to WP10 specs) passes 3 consecutive times, and the result is recorded.

**Done when**: `pnpm test:e2e` passes in full 3 times in a row, and the run summaries are in the Activity Log.

## Context & Constraints

- **Read first**: `contracts/visitor-menu.md` ("Behaviour", "Layout"), `research.md` R-06 (disclosure pattern), `spec.md` User Story 4, `quickstart.md` rows for `a11y.spec.ts` and `layout.spec.ts`.
- **Fixtures** (WP07, `e2e/fixtures.ts`): `test`, `expect`, `PAGES`, `visitorContainerId`, `savedValue`, `seedSaved`, `openMenu`. Use the real exported names.
- **axe**: `import AxeBuilder from '@axe-core/playwright';`. Scan with WCAG A and AA tags: `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])`. This is what NFR-002's "0 violations" is measured against. Also run a separate, **non-failing** best-practice scan once per page and log the findings in the Activity Log for the Product Owner.
- **Never** `disableRules(...)` or exclude the menu or banner to get green. If axe finds a real issue, the fix belongs to WP06's files (`site/src/menu/*`, `site/src/ui/layout.ts`, `site/src/ui/styles.css`). Report it with the axe output (rule id, target, help URL) and send it back to WP06. Don't edit product files from this WP.
- **Secrets**: run-time IDs only.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP10 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T043 – axe matrix

**Steps** (`e2e/a11y.spec.ts`):

1. Generate one test per combination so failures name the case:

   ```ts
   for (const path of PAGES) {
     for (const banner of [false, true]) {
       for (const menuOpen of [false, true]) {
         test(`axe ${path} banner=${banner} menu=${menuOpen ? 'open' : 'closed'}`, async ({ page, gtm }) => {
           if (banner) await seedSaved(page, gtm, savedValue(visitorContainerId('A11Y01'), Date.now()));
           await page.goto(path);
           if (menuOpen) await openMenu(page);
           const results = await new AxeBuilder({ page })
             .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
             .analyze();
           expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
         });
       }
     }
   }
   ```

2. Add one variant with storage unavailable (`blockStorage`) on `/` with the menu open: the disabled input and the note must also pass.
3. Add one variant after a refused save (`aria-invalid="true"` plus message) on `/` with the menu open.

### Subtask T044 – Keyboard flows

**Steps**:

1. On `/`, from the top of the page, press Tab repeatedly (cap at, say, 60 presses) until `document.activeElement` is the "Demo menu" button. Assert it's reachable, `aria-expanded="false"`, and has a visible focus indicator: computed `outline-style` isn't `none` **or** `box-shadow` isn't `none` while focused via keyboard.
2. Press Enter → panel visible, `aria-expanded="true"`, focus is on the heading `#visitor-menu-title`.
3. Press Tab through the panel: reach Close, the path 1 button, the ID input, Save, and all 7 playground buttons. Assert each is reached at least once (collect accessible names).
4. Press Escape (from inside the panel, for example on a playground button) → panel hidden, focus on the toggle.
5. Open again, press Escape **with focus on the toggle** → closes.
6. Space on the toggle opens it (native button).
7. Keyboard save: focus the input, type a run-time ID, press Enter → reload into the visitor state (the form submits with Enter).
8. With the banner shown: Tab reaches "Reset to the shop's container" before the header links. Enter → reload into the shop state.
9. One playground button activated with Enter and one with Space → each adds exactly 2 data layer entries (no double push from key handling).

### Subtask T045 – `e2e/layout.spec.ts`: 360 px

**Steps**:

1. `test.use({ viewport: { width: 360, height: 740 } })`.
2. For each page × {banner, no banner} × {menu closed, menu open}:

   ```ts
   const overflow = await page.evaluate(() =>
     document.documentElement.scrollWidth - document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(0);
   ```

3. Menu open at 360 px: the panel's bounding box lies within the viewport horizontally (`x >= 0`, `x + width <= 360`); the last playground button can be scrolled into view inside the panel (`scrollIntoViewIfNeeded` then `toBeInViewport()`).
4. Toggle size: bounding box at least 44 × 44.
5. Menu closed at 360 px: the toggle doesn't cover the footer text or the page's primary button (for example "Place order" on `/checkout/`) after scrolling to the bottom. Compare bounding boxes for no intersection.

### Subtask T046 – Full run and evidence

**Steps**:

1. `pnpm exec playwright install chromium` (if not done on this machine).
2. Run `pnpm test:e2e` three times in a row. All must pass; no retries are configured, so a flake shows as a failure.
3. Record in the Activity Log for each run: date, total tests, passed, duration; the `container-x10` count (should show ×10 repeats); and confirm `gtm.external` stayed empty (no test failed on it).
4. If a test is flaky, fix the test's waiting strategy in **your** files, or report it to the owning WP. Don't add retries.
5. Record the best-practice axe findings from T043 (non-failing) as a short list for the Product Owner.
6. `pnpm gates` passes; `test-results/` and `playwright-report/` aren't committed.

---

## Definition of Done

- [ ] 20 axe scans plus 2 variants: 0 WCAG A/AA violations.
- [ ] Keyboard flows asserted, including focus return and visible focus.
- [ ] 360 px overflow is 0 on every combination.
- [ ] Full suite green 3× consecutively; evidence recorded.
- [ ] No disabled axe rules, no exclusions.
- [ ] `spec-kitty agent tasks mark-status T043 T044 T045 T046 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Fixing product code from a test WP | Report to WP06 with axe output |
| Hidden panel scanned as present | Assert `hidden` before scanning the closed state |
| Focus-ring check brittle across styles | Accept outline **or** box-shadow; use keyboard focus (Tab), not `.focus()` |

## Review Guidance

- Confirm the tag list and that nothing is excluded or disabled.
- Confirm 3 recorded green runs.
- Spot-check one layout case manually in DevTools at 360 px.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
