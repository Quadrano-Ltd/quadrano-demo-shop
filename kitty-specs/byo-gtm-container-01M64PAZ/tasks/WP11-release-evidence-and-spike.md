---
work_package_id: WP11
title: Release evidence and Preview spike run 2
dependencies:
- WP02
- WP08
- WP09
- WP10
requirement_refs:
- FR-023
- FR-024
- NFR-004
- NFR-006
- SC-007
- SC-008
- C-004
- C-006
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T047
- T048
- T049
- T050
- T051
phase: Phase 5 - Release evidence
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: docs/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- docs/release-checks.md
- docs/spike/preview-spike.md
- docs/spike/*.png
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP11 – Release evidence and Preview spike run 2

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
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

Close the mission with **dated, honest evidence** for everything that can't be automated, and settle the path 2 copy:

- **SC-008 / C-007**: all four gates, `verify:container`, `verify:scenarios` and `test:e2e` pass on the merged tree.
- **NFR-004**: Lighthouse mobile (default Slow 4G) LCP ≤ 2 s on all 5 pages of the Pages preview, menu present and closed.
- **FR-023**: spike run 2 recorded with redacted screenshots in `docs/spike/preview-spike.md`.
- **FR-024**: the path 2 instructions match the spike result.
- **NFR-006 / SC-007**: on production, each of the 7 playground pushes produces its expected Console group in 10 of 10 presses through path 1 and through path 2.

Several steps need the **Product Owner** (a real GTM account, Tag Assistant, production access). Your job is to prepare everything, run what you can, and record exactly what happened. **Never fabricate or predict a result.** If a step hasn't happened yet, record "not yet run" with the reason, as `docs/release-checks.md` already does for the CI run.

**Done when**: `docs/release-checks.md` has a dated section for this mission covering T047, T048 and T051; `docs/spike/preview-spike.md` "Run 2" is filled in with redacted screenshots; the path 2 copy matches; the Product Owner has signed off, or the open items are listed explicitly for them.

## Context & Constraints

- **Read first**: `quickstart.md` ("Manual, before rehearsals"), `docs/spike/preview-spike.md` (Run 1 and the Run 2 steps already written there), `docs/release-checks.md` (existing format: what, how, environment, results table, evidence), `contracts/visitor-menu.md` (path 2 copy and the alternative step 5), `spec.md` Assumptions (Preview spike), C-006 (land before rehearsals finish, Thu 19 Nov 2026).
- **Redaction**: container IDs are never written in docs. In text and screenshots use `visitor GTM-****` and `shop GTM-****`, as Run 1 does. Check every screenshot pixel-level for unredacted IDs before committing; the no-secrets gate can't see into images.
- **Expected Console groups** per push: `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`.
- **Path 2 copy** lives in `site/src/menu/visitor-menu.ts` (WP06), in an isolated `PREVIEW_STEP` constant. That file isn't owned here. See T050 for how to handle a change.
- **Deploys**: every branch push gets a Cloudflare Pages preview deploy (`AGENTS.md` "Deploy"). Pushing needs the Product Owner's go-ahead; ask before pushing.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP11 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T047 – Gates and checks on the merged tree

**Steps**:

1. On the merged mission tree (all of WP01 to WP10), with a clean install: `pnpm install --frozen-lockfile`.
2. Run and capture exit codes and summary lines:
   - `pnpm gates` → `gates: all 4 passed`
   - `node scripts/no-secrets.ts --history` → `no-secrets: 0 findings`
   - `pnpm verify:container` → all `ok`
   - `pnpm verify:scenarios` → all `ok` (unchanged)
   - `pnpm test:e2e` → all passed (note the test count and the ×10 container project)
3. Add a section `## byo-gtm-container-01M64PAZ — gates and checks` to `docs/release-checks.md` in the existing style: Checked / How / Environment (OS, Node, pnpm, commit) / Results table / Evidence.
4. If a CI run exists for the branch, record `gh run list --branch feat/byo-gtm-container --limit 1` output; if not, say why.

### Subtask T048 – Lighthouse LCP (NFR-004)

**Steps**:

1. After the Product Owner approves pushing `feat/byo-gtm-container`, get the Pages preview URL (`<hash>.quadrano-demo-shop.pages.dev` or the branch alias).
2. Chrome DevTools → Lighthouse → Mobile, Performance only, default throttling (Slow 4G), on each of the 5 pages, with no saved ID and the menu closed.
3. Record each page's LCP and overall score in a table. Pass if every LCP ≤ 2.0 s.
4. If a page misses, record it and report to the Product Owner with the Lighthouse diagnostics. Don't tune product code in this WP.

### Subtask T049 – Spike run 2 with the Product Owner (FR-023)

**Steps**:

1. Prepare: check that the Run 2 steps in `docs/spike/preview-spike.md` still match the built UI (labels "Demo menu", "Let me bring my own GTM container", "Save", banner text). If they differ, update the steps' wording only.
2. The Product Owner runs the 6 steps on the Pages preview: fresh never-published container; enter its ID in the menu; start Preview; check found / not found for both containers; navigate across ≥ 3 pages; add a Quadrano Local snippet in a Custom HTML tag, refresh Preview, press playground buttons; look for a ✓ group and a ✗ group in the Console.
3. Fill in a results table in the same shape as Run 1 (Check | Result), with the date and "Checked by: the Product Owner".
4. Screenshots: save as `docs/spike/run2-*.png` with both IDs redacted; reference them in the doc.
5. Write a "Conclusion (run 2)" stating plainly whether a never-published container runs in Preview when the shop loads it.

### Subtask T050 – Settle path 2 copy (FR-024)

**Steps**:

1. **If run 2 shows the container runs unpublished**: no code change. Record "path 2 copy confirmed as shipped" in the spike doc and the Activity Log.
2. **If it doesn't**: step 5 must become exactly "Submit and publish your container, then reload this page." (contract). This is a one-constant change in `site/src/menu/visitor-menu.ts` (`PREVIEW_STEP`), outside this WP's owned files. Make it as a **recorded out-of-map edit** with a one-line rationale in the Activity Log ("FR-024: spike run 2 failed; contract-specified copy swap"), keep lint green, and re-run `e2e/menu.spec.ts`. Also update the SC-007 rehearsal steps in T051 to publish first.
3. Either way, the spike doc ends with the final copy of step 5 quoted.

### Subtask T051 – Production rehearsal check (NFR-006, SC-007)

**Steps** (after the mission's PR is merged to `main` and production is deployed; Product Owner present):

1. **Path 1**: fresh browser profile on production, no saved ID; open the Console; open the menu; press each of the 7 playground buttons 10 times. Each press → the expected Console group from the push contract. Tally per button (n/10).
2. **Path 2**: fresh, empty container plus a Quadrano Local snippet (in Preview, unpublished, or published if T050 switched the copy); enter its ID; repeat the 70 presses; tally.
3. SC-007: confirm at least one ✓ group and one ✗ group appear via path 2.
4. Reset to the shop's container at the end; confirm the banner is gone.
5. Record both tally tables in `docs/release-checks.md` with date, browser version and who pressed. Any count below 10/10 → record it and raise it with the Product Owner (QDR-006). Don't round up.
6. Product Owner sign-off line at the end of the section, or "Awaiting Product Owner sign-off" if not yet given.

---

## Definition of Done

- [ ] T047 recorded with real outputs.
- [ ] T048 recorded (or "not yet run" with reason).
- [ ] Spike run 2 recorded with redacted screenshots, or explicitly pending with the date the Product Owner plans to run it.
- [ ] Path 2 copy matches the spike result.
- [ ] Rehearsal tallies recorded, or explicitly pending.
- [ ] No unredacted IDs in docs or images; `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T047 T048 T049 T050 T051 --status done --mission byo-gtm-container-01M64PAZ` (only for subtasks actually completed).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Product Owner time before 19 Nov | Prepare everything; list exact remaining steps and a target date |
| Unredacted ID in a screenshot | Manual pixel check; the reviewer re-checks |
| Pressure to record "pass" without running | Record only observed results; "not yet run" is acceptable |
| Spike fails late | Copy swap is one constant; e2e menu spec re-run |

## Review Guidance

- Every number in the docs must trace to a real run (command output, screenshot or named person and date).
- Open each new PNG and look for IDs.
- If T050 made an out-of-map edit, confirm it's only `PREVIEW_STEP`.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
