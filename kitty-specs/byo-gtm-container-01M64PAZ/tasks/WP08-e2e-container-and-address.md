---
work_package_id: WP08
title: 'e2e: one container, and the address never chooses'
dependencies:
- WP06
- WP07
requirement_refs:
- FR-001
- FR-011
- FR-012
- FR-013
- NFR-001
- SC-001
- SC-002
- SC-004
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T035
- T036
- T037
- T038
phase: Phase 4 - Verification
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: e2e/
create_intent:
- e2e/container.spec.ts
- e2e/address.spec.ts
execution_mode: code_change
model: ''
owned_files:
- e2e/container.spec.ts
- e2e/address.spec.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP08 – e2e: one container, and the address never chooses

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

Prove the mission's central safety claims in a real browser, with googletagmanager.com stubbed:

- **NFR-001 / SC-001 / SC-002 / FR-001**: across all 5 pages, in both states (no saved ID; a saved ID), every page load makes **exactly 1** `gtm.js` request with the expected `id`, and **0** for the other container, in 10 out of 10 runs (`container-x10` project, `repeatEach: 10`).
- **FR-011 / FR-012**: expired, tampered and future-dated saved values load the shop's container and are removed; a throwing `localStorage` loads the shop's container and sets `data-storage="unavailable"`.
- **FR-010 / SC-002**: reset brings the shop's container back on the next load.
- **FR-013 / SC-004**: at least 5 crafted links carrying a container ID, in both states, change nothing.

**Done when**: `pnpm test:e2e --project=container-x10` and `pnpm test:e2e e2e/address.spec.ts` both pass, and no ID-shaped literal other than `GTM-XXXXXXX` appears in your files.

## Context & Constraints

- **Read first**: `quickstart.md` ("What `test:e2e` proves": rows for `container.spec.ts` and `address.spec.ts`), `research.md` R-05 (crafted link list), R-10 (test design), `contracts/container-choice.md`.
- **Use WP07's fixtures** (`e2e/fixtures.ts`): `test`, `expect`, `SHOP_CONTAINER_ID`, `visitorContainerId()`, `STORAGE_KEY`, `LIFETIME_MS`, `PAGES`, `savedValue()`, `seedSaved()`, `blockStorage()`, `openMenu()`. Read the real file first and use the names it actually exports. If a helper you need is missing, write it locally in your spec rather than editing `fixtures.ts` (owned by WP07).
- `playwright.config.ts` runs `container.spec.ts` **only** in the `container-x10` project (repeat ×10) and everything else in `chromium`.
- **Counting rule**: reset the recorder (`gtm.reset()`) immediately before the navigation under test, then wait for `load` before reading `gtm.ids`. The stub fulfils instantly, so the request has happened by `load`. A safe extra wait: `await expect.poll(() => gtm.ids.length).toBe(1)`, then a short `page.waitForTimeout(100)` and assert it's **still** 1.
- **Secrets**: build every ID at run time (fixtures do this). In `address.spec.ts` the crafted links carry IDs built with `visitorContainerId('LINK01')` and similar, never typed literally.
- **Page-specific behaviour**: `/thank-you/` with no order shows the "no order" state. That's fine; it still loads exactly one container.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP08 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T035 – One request per load, both states, 5 pages

**Steps**:

1. `e2e/container.spec.ts`, `test.describe('one container per page (NFR-001)')`.
2. **No saved ID** (SC-001): for each path in `PAGES`:

   ```ts
   gtm.reset();
   await page.goto(path);
   await expect.poll(() => gtm.ids.length).toBe(1);
   expect(gtm.ids).toEqual([SHOP_CONTAINER_ID]);
   await expect(page.locator('html')).toHaveAttribute('data-container-source', 'shop');
   await expect(page.locator('.visitor-banner')).toHaveCount(0);
   expect(gtm.external).toEqual([]);
   ```

3. **Saved ID** (SC-002): `const visitor = visitorContainerId();` → `seedSaved(page, gtm, savedValue(visitor, Date.now()))`; then for each path: reset, goto, expect `gtm.ids` equal to `[visitor]` (so the shop's ID count is 0), `data-container-source="visitor"`, `data-visitor-container` = visitor, banner text contains the visitor ID.
4. One `test()` per state that loops the 5 pages. With `repeatEach: 10` that's 2 × 5 × 10 = 100 checked loads.
5. **Visitor enters the shop's own ID** (spec Edge Cases): seed `savedValue(SHOP_CONTAINER_ID, now)` → exactly one request, for that ID, source `visitor`.

### Subtask T036 – Expired, tampered, future-dated, throwing storage

**Steps**: one test each, on `/` (and one other page for the expired case):

| Case | Seed value | Expect |
|---|---|---|
| Expired | `savedValue(visitor, Date.now() - LIFETIME_MS - 1000)` | `ids = [SHOP]`; `localStorage.getItem(STORAGE_KEY)` is `null` after load |
| Just under 24 h | `savedValue(visitor, Date.now() - LIFETIME_MS + 60_000)` | `ids = [visitor]` (the boundary is real) |
| Future-dated | `savedValue(visitor, Date.now() + 60_000)` | `ids = [SHOP]`; key removed |
| Tampered: junk | `'junk'` | `ids = [SHOP]`; key removed |
| Tampered: lower-case id | `savedValue(visitor.toLowerCase(), Date.now())` | `ids = [SHOP]`; key removed |
| Tampered: extra key | `JSON.stringify({ id: visitor, savedAt: Date.now(), x: 1 })` | `ids = [SHOP]`; key removed |
| Storage throws | `blockStorage(page)` before `goto` | `ids = [SHOP]`; `<html data-storage="unavailable">`; opening the menu shows the "isn't available in this browser" note and the ID input is disabled |

Note: with `blockStorage`, your own `page.evaluate(() => localStorage…)` would also throw. Don't read storage in that test.

### Subtask T037 – Reset restores the shop's container

**Steps**:

1. Seed a visitor ID; goto `/product/`; expect `[visitor]`.
2. Click the banner's "Reset to the shop's container". `await page.waitForLoadState('load')` after the reload it triggers. Reset the recorder **before** the click, and expect `ids` to end as `[SHOP_CONTAINER_ID]` for the reloaded page.
3. Expect no banner, `data-container-source="shop"`, and `localStorage.getItem(STORAGE_KEY) === null`.
4. Repeat via the menu: open the menu, path 1 button "Show me the output with the pre-built container" → same result (FR-010, User Story 2 scenario 2).

Tip: wrap the click in `Promise.all([page.waitForNavigation(), click])` or use `page.waitForURL` / `waitForLoadState` after the click, whichever is reliable for `location.reload()` in your Playwright version.

### Subtask T038 – `e2e/address.spec.ts`: crafted links

**Purpose**: SC-004: 0 of at least 5 crafted links change the container (FR-013, C-005).

**Steps**:

1. `const linkId = visitorContainerId('LINK01');` Build the crafted paths at run time:

   ```ts
   const crafted = [
     `/?gtm=${linkId}`,
     `/?id=${linkId}`,
     `/?gtm_id=${linkId}`,
     `/#${linkId}`,
     `/product/?gtm=${linkId}&scenario=missing-value`,
     `/basket/?container=${encodeURIComponent(linkId)}#gtm=${linkId}`,
     `/${linkId}/`,            // path form: expect the host's 404 page or fallback; the point is no request for linkId
   ];
   ```

2. **State A, no saved ID**: for each crafted path → reset, goto, then `gtm.ids` must not contain `linkId`. For the shop pages, `ids` equals `[SHOP_CONTAINER_ID]`. `localStorage.getItem(STORAGE_KEY)` stays `null`.
3. **State B, saved visitor ID** (different from `linkId`): for each → `ids` equals `[visitor]` (or is empty for a 404 path), never contains `linkId`; the stored value is unchanged (compare the raw string before and after).
4. The path form `/${linkId}/` may 404 under `vite preview`. Assert only that `linkId` was never requested and storage is unchanged; don't assert the 404 page's container behaviour.
5. Assert the count of crafted links ≥ 5 in the test, so the SC-004 floor is self-checking.
6. Bonus check (cheap): the `?scenario=missing-value` link still selects that scenario in the header switcher (`#scenario-select` has value `missing-value`). The container choice and the scenario are independent.

---

## Definition of Done

- [ ] `container.spec.ts` passes under `container-x10` (100 checked loads plus edge cases, ×10).
- [ ] `address.spec.ts` passes in `chromium`; ≥ 5 crafted links, both states.
- [ ] No real network (`gtm.external` empty in every test).
- [ ] No ID-shaped literal except `GTM-XXXXXXX`.
- [ ] `pnpm lint` passes on the new files; `pnpm gates` passes.
- [ ] Run summary (counts, duration) in the Activity Log.
- [ ] `spec-kitty agent tasks mark-status T035 T036 T037 T038 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Counting a request from the previous page | `gtm.reset()` right before each navigation |
| Flaky reload detection after reset | Wait for `load` plus poll on `ids` |
| A failing test tempts a product-code fix | Product code is owned by WP03/WP04/WP06. Report the defect with evidence; don't edit outside `owned_files` |

## Review Guidance

- Confirm every assertion compares against run-time IDs from fixtures.
- Confirm the two-state loop covers all 5 pages, and that `repeatEach: 10` applies (run output shows ×10).
- Check the crafted list includes query, fragment and path forms.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
