---
work_package_id: WP08
title: Freeze reconciliation and rehearsal evidence
dependencies:
- WP07
requirement_refs:
- C-004
- C-008
- FR-024
- NFR-003
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T039
- T040
- T041
phase: Phase 4 - Release and rehearsal
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: docs/rehearsal-log.md
create_intent:
- docs/rehearsal-log.md
execution_mode: code_change
model: ''
owned_files:
- docs/rehearsal-log.md
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP08 – Freeze reconciliation and rehearsal evidence

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter (or any user-defined profile), and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission demo-shop-01M5QW5Y`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Prove the demo does what the talk needs, against the **real** Event Definitions:

- **FR-024**: after the W2 freeze (Tue 27 Oct 2026), the shop's Attribute names, types and `transaction_id` pattern match the confirmed `add_to_cart` / `purchase` Event Definitions. If they differ, the shop, `pnpm verify:scenarios` and `contracts/datalayer-pushes.md` are corrected together.
- **NFR-003 / SC-001**: with the "Demo Shop" Specification's snippet installed in the shop's GTM container, all **7 scenario outcomes** (2 correct events + 5 broken scenarios) produce their expected Console group, compared **character for character**, in **10 of 10** runs of the quickstart pre-rehearsal table.
- **SC-002**: with the snippet **not** installed, **0** verdict lines across a full talk-script run.
- **SC-003**: the shop part of the talk (steps 1 and 7) walked in **under 3 minutes**.
- `docs/rehearsal-log.md` records all of the above, plus a section where the three clean rehearsals due by Thu 19 Nov 2026 (SC-004, C-008) will be logged.

## ⛔ Entry conditions (check first; block if not met)

This WP depends on **external** artefacts this repo does not build (C-007):

1. **The W2 freeze has happened** (on or after Tue 27 Oct 2026), and the confirmed `add_to_cart` / `purchase` Event Definitions are available to you (from the Product Owner).
2. **The "Demo Shop" Specification snippet exists** and is installed as the Custom HTML tag in the shop's GTM container (published, or in a Preview workspace you can connect Tag Assistant to).
3. WP07 is done: `demo.quadrano.com` live (or a local build with network to reach GTM).

If any is missing, **do not improvise**. Do not hand-build a stand-in Specification, and do not change Attribute names on a guess. Move the WP to `blocked` with a structured report (QDR-006): what is missing, who owns it, and the date impact against Sun 8 Nov (demoable) and Thu 19 Nov (talk).

**Known risk (spec Assumptions)**: the GA4 nested shape needs Quadrano Local to support object Attributes and lists of objects. If nested Event Definitions did not ship by the freeze, the Product Owner must choose between a flat shape and cutting the nested rules. **That decision is not yours**; escalate it, and resume when the PO has decided. A switch to a flat shape would be a contract change needing PO sign-off (QDR-005) and likely a new WP.

## Context & Constraints

- `contracts/datalayer-pushes.md`: expected Console groups (format v1, verbatim). **This is what you compare against.**
- `quickstart.md`: Pre-rehearsal check table (rows 1–10) and "After the W2 freeze".
- `spec.md`: US1, US2 tables; NFR-003; SC-001 to SC-004; Assumptions.
- `research.md`: R-03 (rehearse with "Preserve log" **off** to prove the thank-you push survives navigation), R-05, R-06.
- **Out-of-map edits (FR-024 only)**: correcting names or the pattern touches `site/src/datalayer/events.ts`, `scenarios.ts`, possibly `scripts/verify-scenarios.ts` (WP04) and `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`. These edits are expected and justified. Keep them to the minimum the freeze requires, record each with a one-line rationale in the Activity Log, and keep FR-012 (one difference per scenario) intact.
- **The shop never judges**: never add any verdict output to make a comparison easier. All ✓/✗ text comes from the Quadrano runtime (FR-017).
- Never record the container ID or any denylist term in the log.

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP08 --agent claude`.

## Subtasks & Detailed Guidance

### Subtask T039 – W2 freeze reconciliation (FR-024)

- **Steps**:
  1. Obtain the confirmed `add_to_cart` and `purchase` Event Definitions from the Product Owner (export or screenshot from Quadrano Local).
  2. Build a comparison table in `docs/rehearsal-log.md`, one row per Attribute path, with columns `path | shop name | shop type/rule | confirmed name | confirmed type/rule | match?`. Cover: `ecommerce` (object, required); `ecommerce.currency` (required, one of GBP, EUR, USD); `ecommerce.value` (required, number); `ecommerce.items` (required, list of objects); `items[].item_id`, `item_name` (text), `price` (number), `quantity` (whole number), all required; `purchase` adds `ecommerce.transaction_id` (required, text matching the pattern). Also check whether unknown Attributes are reported, since scenario 3's warning line depends on it.
  3. **All match** → record "No change needed" with the date. Done.
  4. **Differences** (e.g. a different pattern, or a renamed Attribute):
     - Update `TRANSACTION_ID_PATTERN` and/or the Attribute names in `events.ts` (single definitions per WP04), and any scenario that references them in `scenarios.ts`. Scenario 5's bad value must still fail the new pattern; scenario 2's literal must still be the hero price as text.
     - Update the expected tables in `verify-scenarios.ts` if they name the changed path.
     - Update `contracts/datalayer-pushes.md`: objects, the one-difference table and the expected Console groups (e.g. scenario 5's pattern text as the Event Definition holds it).
     - Run `pnpm verify:scenarios` and `pnpm gates`; both must pass.
     - After the change reaches production (Cloudflare Pages Git integration), re-verify the live site: `demo.quadrano.com` serves the new build with GTM, and the WP07 local fallback still works. Append a dated "Post-freeze re-check" entry to `docs/release-checks.md`. This is an out-of-map edit of a WP07 file, recorded in the activity log.
     - If the expected **Console wording** changes in a way the spec's US2 table doesn't anticipate, flag it to the PO; the spec table may need a patch.
- **Notes**: Today is before the freeze. Do not start T039 early on provisional information.

### Subtask T040 – Pre-rehearsal check ×10 with the snippet installed

- **Setup** (quickstart): Chrome, DevTools Console open, **"Preserve log" off**, Tag Assistant connected, the Specification's tag in the container. Use the production URL. If a fallback is needed, use a local build that can reach GTM; note which.
- **Each run** walks quickstart rows 1–9 in order:
  1. `/product/?id=SKU-1001&scenario=correct` → Add to basket → `✓ add_to_cart`
  2. Checkout → Place order → `✓ purchase` on thank-you
  3. Order again → `1 · Missing value` → Place order → `✗ purchase · 1 error` / `ecommerce.value is required, but is missing.`
  4. Order again → `2 · Value as text` → Place order → `✗ purchase · 1 error` / `ecommerce.value should be a number, but got "12.99".`
  5. Order again → `3 · Wrong-case key` → Place order → `✗ purchase · 1 error, 1 warning` / `ecommerce.transaction_id is required, but is missing.` / `ecommerce.transaction_ID isn't in the Event Definition. Did you mean transaction_id?`
  6. Order again → `4 · Lower-case currency` → Place order → `✗ purchase · 1 error` / `ecommerce.currency should be one of GBP, EUR, USD, but got "gbp".`
  7. Order again → `Spare · Bad transaction ID` → Place order → `✗ purchase · 1 error` / `ecommerce.transaction_id should match the pattern <pattern as held>, but got "12345".`
  8. Reload thank-you → **no** new Console group
  9. Switch scenario on any page → **no** new Console group; the URL changes
- **Character-for-character comparison**: right-click the Console group → "Copy" (or select and copy) and paste into the log next to the expected text. A small diff (e.g. `diff <(echo expected) <(echo actual)`) is acceptable evidence. The group header comes first, then its lines; the `Pushed:` line is omitted from the comparison (spec US2).
- **Log format** in `docs/rehearsal-log.md`: one table per run, `run # | date/time | row | expected | matched (yes/no) | note`. Any **no** fails the run. Fix the cause (if it's the shop) and restart the count. NFR-003 requires **10 consecutive** clean runs; the log must show them.
- If a mismatch traces to the **runtime or Specification** (not the shop), record it and escalate to the PO. Do not alter the shop to "make it match" unless the freeze says the shop is wrong.

### Subtask T041 – No-snippet run, talk timing and rehearsal sign-off record

- **Steps**:
  1. **SC-002**: with the Quadrano tag removed (or a GTM Preview workspace without it), walk rows 1–2 and one broken scenario. Expect the events in Tag Assistant and **zero** verdict lines in the Console. Record it.
  2. **SC-003**: time a straight walk of the talk's shop part (step 1: correct add to basket and purchase; step 7: broken scenarios 1–4, using Order again and the control or bookmarks) from a cold start. Record the duration; the target is < 3:00. If over, note which interaction is slow and propose a fix (e.g. extra bookmarks in the README) to the PO.
  3. Add a **Rehearsals** section to `docs/rehearsal-log.md` with a table for the three consecutive clean rehearsals due by Thu 19 Nov 2026 (`date | presenter | unexpected Console output? | manual recovery? | result`). Fill in any rehearsal already held. Leave the rest as pending rows for the PO. They extend beyond this WP's completion and are tracked by the PO (SC-004).
  4. Add a short sign-off block for the Product Owner: "Demoable end to end" (target Sun 8 Nov 2026) with date and name left blank for them.

## Definition of Done

- [ ] Entry conditions confirmed (or the WP is blocked with a structured report).
- [ ] Freeze comparison table recorded; any correction made in shop, verify and contract together, with `pnpm verify:scenarios` and `pnpm gates` green, and a post-freeze re-check in `docs/release-checks.md` if anything changed.
- [ ] 10 consecutive clean runs of rows 1–9 logged with verbatim comparisons.
- [ ] No-snippet run shows zero verdict lines.
- [ ] Talk-part timing recorded (< 3 min, or a proposal if over).
- [ ] Rehearsals table and PO sign-off block present.
- [ ] Out-of-map edits (if any) each have a one-line rationale in the Activity Log.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Nested Event Definitions not available | Block and escalate; PO decides flat vs cut (spec Assumptions) |
| "Preserve log" left on hides the R-03 proof | Setup step requires it off; note it per run |
| Mismatch caused by runtime or Specification, "fixed" in the shop | Only change the shop when the freeze says it's wrong; escalate otherwise |
| Flaky run due to GTM load timing | Quadrano replays pushes made before load (contract G-10); if a run is flaky, record and investigate, never paper over it |

## Review Guidance

- Spot-check three logged comparisons against `contracts/datalayer-pushes.md`, character for character.
- If T039 changed code: check FR-012 still holds (`pnpm verify:scenarios`), and that the contract and code agree.
- Confirm 10 **consecutive** clean runs, not 10 cherry-picked ones.
- Confirm nothing in the shop was added to print or show verdicts.

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
