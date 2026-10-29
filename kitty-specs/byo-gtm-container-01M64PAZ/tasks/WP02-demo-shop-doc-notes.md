---
work_package_id: WP02
title: Demo-shop documentation notes
dependencies:
- WP01
requirement_refs:
- FR-025
- FR-026
- C-003
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T005
- T006
- T007
phase: Phase 1 - Rulebook
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: architect-alphonso
authoritative_surface: kitty-specs/demo-shop-01M5QW5Y/
create_intent: []
execution_mode: planning_artifact
model: ''
owned_files:
- kitty-specs/demo-shop-01M5QW5Y/spec.md
- kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md
role: architect
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP02 – Demo-shop documentation notes

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `architect-alphonso`
- **Role**: `architect`
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

The earlier mission `demo-shop-01M5QW5Y` documents rules that Charter 1.1.0 (WP01) now scopes, and a push contract that must stay the single description of every push. This WP makes those documents say so, with the smallest possible edits:

1. **FR-025 (scoping)**: demo-shop FR-003, NFR-004 and C-011 each gain an inline "Scoped by Charter 1.1.0" annotation. Their own text does not otherwise change (research R-09).
2. **FR-026**: the push contract `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md` gains the Event playground note under "Sequence per action", word for word from `contracts/playground-pushes.md`.

**Done when**: `git diff` on the two files shows only the three annotations and the one inserted note, the Markdown tables still render (same number of `|` cells per row), and `pnpm gates` passes.

## Context & Constraints

- **Read first**: `kitty-specs/byo-gtm-container-01M64PAZ/research.md` R-09 ("Scoping"), `contracts/playground-pushes.md` ("Note added to the demo-shop push contract"), and WP01's merged charter text (the 1.1.0 scoping paragraph).
- The demo-shop spec's requirement tables are pipe tables with columns `ID | Title | Requirement | … | Status`. Row line numbers at planning time: FR-003 ≈ line 134, NFR-004 ≈ line 164, C-011 ≈ line 181. Find them by ID, not by line number.
- **Do not** change any status, priority or other cell; do not renumber anything; do not edit other rows.
- **Secrets**: no container ID of any shape except `GTM-XXXXXXX`.
- This is a `planning_artifact` WP: only these two files are in scope.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP02 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T005 – Annotate FR-003, NFR-004 and C-011

**Purpose**: Anyone reading the demo-shop spec must see that these three rows are no longer the whole story, and where to look.

**Steps**:

1. In the **Requirement** (or **Constraint**) cell of each row, append one sentence at the end of the existing text, inside the same cell:
   - FR-003: ` *Scoped by Charter 1.1.0: superseded by byo-gtm-container-01M64PAZ#FR-001 (exactly one container per page, the shop's own or the visitor's).*`
   - NFR-004: ` *Scoped by Charter 1.1.0: covers only the shop's own container; what a visitor's own container loads is the visitor's choice.*`
   - C-011: ` *Scoped by Charter 1.1.0: covers only the shop's own container.*`
2. Keep the pipes intact: the annotation goes before the cell's closing ` |`.
3. Do not touch the `Status` column.

**Validation**:
- [ ] Each of the three rows has the same number of cells as before (`awk -F'|' '{print NF}'` on those lines matches neighbouring rows).
- [ ] `git diff --word-diff` shows only additions on those three lines.

### Subtask T006 – Event playground note in the push contract

**Purpose**: FR-026: the push contract stays the single description of every push, so it must say the playground makes the same pushes.

**Steps**:

1. Open `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`, section `## Sequence per action`.
2. After the line "Switching scenario, navigating, and "Order again" push nothing." insert a blank line and then the note, verbatim:

   > **Event playground** (visitor menu, mission `byo-gtm-container-01M64PAZ`): one button per push in this file — `add_to_cart` and `purchase` in every scenario — makes the same two calls with the same shapes, using the hero product and a fresh transaction id. It pushes nothing else.

3. Do not change any push shape, example or invariant in the file.

**Validation**:
- [ ] The note sits inside "Sequence per action", before `## \`add_to_cart\` (all scenarios)`.
- [ ] Nothing else in the file changes.

### Subtask T007 – Secrets and terminology check

**Steps**:

1. Run `pnpm gates`; it must pass. (`no-secrets` scans every tracked file, including `kitty-specs/`.)
2. Grep both files for banned synonyms you might have introduced: `parameter`, `field`, `property` used for an Attribute. The note above uses none; keep it that way.
3. Record the gate output summary in the Activity Log.

---

## Definition of Done

- [ ] T005–T007 complete and marked: `spec-kitty agent tasks mark-status T005 T006 T007 --status done --mission byo-gtm-container-01M64PAZ`.
- [ ] Only the three annotations and the one note changed.
- [ ] Gates pass.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Broken table rows | Cell-count check in T005 |
| Rewording the original requirement | Append only; reviewer uses `--word-diff` |
| Drift from the WP01 wording | Read WP01's merged charter text first |

## Review Guidance

- `git diff --word-diff kitty-specs/demo-shop-01M5QW5Y/` must show additions only.
- The playground note must match `contracts/playground-pushes.md` exactly.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
