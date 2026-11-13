---
work_package_id: WP01
title: Charter 1.2.0
dependencies: []
requirement_refs:
- FR-015
- FR-014
- C-003
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-on-page-results-mirror-01M78JHF
base_commit: 88d6f4e1a887a2cd529929a082f1123d4151328e
created_at: '2026-11-13T06:56:09.889897+00:00'
subtasks:
- T001
- T002
- T003
- T004
phase: Phase 1 - Rulebook
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: architect-alphonso
authoritative_surface: .kittify/charter/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- .kittify/charter/charter.md
- .kittify/charter/charter.yaml
role: architect
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP01 – Charter 1.2.0

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `architect-alphonso`
- **Role**: `architect`
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

Amend the Charter from 1.1.1 to **1.2.0 (minor)**. The amendment says the shop may repeat the runtime's Console output on the page, word for word, when a visitor turns on the Results view, and that the shop still never judges a push (FR-015).

The text was proposed by the Architect in `kitty-specs/on-page-results-mirror-01M78JHF/contracts/charter-amendment.md`. **Apply it as written. Don't reword it.**

**Done when**:

- `.kittify/charter/charter.md` reads version 1.2.0 with today's amended date.
- The new bullet, the new enforcement row and the new amendment-log row match the contract word for word.
- The headings *Policy Summary*, *Terminology Canon*, *Code Review Checklist* and *Regression Vigilance* are unchanged (Spec Kitty reads those sections by heading).
- `.kittify/charter/charter.yaml` agrees with `charter.md`.
- `pnpm gates` passes.
- The commit message gives the reasoning (QDR-007).

## Context & Constraints

- **Read first**: `contracts/charter-amendment.md` (the whole file is the spec for this WP), the spec's FR-014 and FR-015 rows, C-003, and the "Changing the Charter (QDR-007)" section of `charter.md`.
- **Why minor**: "the shop never judges a push" is a rule of the shop today (demo-shop FR-017, enforced by lint), but the Charter doesn't state it. This amendment writes the rule and its enforcement row into the Charter, and QDR-007 types a new rule as minor. The version is settled: use 1.2.0 and the type `Minor` everywhere. Don't use 1.1.2 or `Patch`.
- **Mechanism in the same pull request (QDR-007)**: the lint override (WP02), `pnpm verify:results` (WP04) and the `AGENTS.md` code rule (WP04) land on the same mission branch and reach `main` in the same pull request. This WP names them in the Charter; it doesn't build them.
- **Scope of the reversal (C-003)**: the amendment-log row says byo-gtm-container C-009 is superseded for the on-page panel only. Nothing else about that mission's scope changes.
- **Provenance (QDR-001)**: name no prior venture in the files or the commit message.
- **Out of scope for this WP**: `AGENTS.md`, `README.md`, `eslint.config.js`, `scripts/`. Other work packages own them.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP01 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T001 – Charter header: version 1.2.0 and amended date

**Purpose**: QDR-007 requires every amendment to update the version and date at the top.

**Steps**:

1. Open `.kittify/charter/charter.md`. Line 3 currently reads:

   ```markdown
   **Version 1.1.1** · adopted 2026-10-24, amended 2026-10-30 · ratified when merged to `main` · see the [amendment log](#amendment-log)
   ```

2. Change `1.1.1` to `1.2.0` and the amended date to the day you commit, in `YYYY-MM-DD` form. Leave the adopted date and the rest of the line as they are.

**Files**: `.kittify/charter/charter.md`

**Validation**:
- [ ] Version reads `1.2.0`.
- [ ] The amended date is the commit date.
- [ ] Nothing else on the line changed.

### Subtask T002 – New last bullet in "Verification that proves something"

**Purpose**: State the rule in the Charter's own words, where the honest-signal rules already live.

**Steps**:

1. Find the section `## Verification that proves something`. It has four bullets today; the last begins "Reviewers re-run the gates themselves".
2. Add this as the new **last** bullet, word for word:

   ```markdown
   - The shop never judges a push and writes no verdict of its own, on the page or in the Console. When a visitor turns on the Results view, the shop may repeat the runtime's Console output on the page, word for word; every verdict shown is still the runtime's (1.2.0).
   ```

3. Don't change the four existing bullets.

**Files**: `.kittify/charter/charter.md`

**Validation**:
- [ ] The bullet is the fifth and last in the section.
- [ ] Its text equals the contract's, character for character.

### Subtask T003 – New enforcement row and new amendment-log row

**Purpose**: QDR-007 requires an amendment-log row and a statement of the enforcing mechanism.

**Steps**:

1. In `## How the Charter is enforced`, add this row to the table. Put it directly after the "One container per page (QDR-002, 1.1.0)" row, so the versioned rules sit together:

   ```markdown
   | The shop never judges (demo-shop FR-017, 1.2.0) | Lint in `site/**`: no Console use and no verdict wording. The Console rule is off for `site/src/results/console-mirror.ts` only; the verdict-wording rule stays on there. `pnpm verify:results` proves the Console rule still fires elsewhere. |
   ```

2. In `## Amendment log`, add this as the last row, with the commit date in place of `(commit date)`:

   ```markdown
   | 1.2.0 | (commit date) | Minor | The shop may repeat the runtime's Console output on the page, word for word, when a visitor turns on the Results view; it still never judges a push. Supersedes byo-gtm-container C-009 for the on-page panel only. Mechanism: `no-console` is turned off for `site/src/results/console-mirror.ts` and nowhere else; the verdict-wording rule is unchanged; `pnpm verify:results` checks the rule still fires outside that file. Gate set and order unchanged. |
   ```

3. Check both tables still render: each row has the same number of pipes as its header.

**Files**: `.kittify/charter/charter.md`

**Validation**:
- [ ] The enforcement row's text equals the contract's.
- [ ] The amendment-log row's date equals the header's amended date, and its Type is `Minor`.
- [ ] Both tables render as tables.

**Edge cases**:
- The contract shows each row under its own header row for readability. Add only the data row; the tables already have headers.

### Subtask T004 – `charter.yaml` agreement, gates and the commit

**Purpose**: The two Charter files must always agree, and the amendment must explain itself in its commit.

**Steps**:

1. Search `.kittify/charter/charter.yaml` for the project directives QDR-001 to QDR-007 and for any wording about Console output, verdicts or the Charter version:

   ```bash
   grep -n -i "console\|verdict\|1\.1\.1\|1\.1\.0\|QDR-00" .kittify/charter/charter.yaml
   ```

2. Expected result: the directives hold no wording about Console output, so their text doesn't change. If the file records the Charter version (for example `1.1.1`), set it to `1.2.0`. If it doesn't, change nothing in the file and say so in the Activity Log.
3. Confirm the four headings Spec Kitty reads are untouched:

   ```bash
   grep -n "^## Policy Summary\|^## Terminology Canon\|^## Code Review Checklist\|^## Regression Vigilance" .kittify/charter/charter.md
   ```

   Expect exactly four lines.
4. Run `pnpm gates`. All four must pass.
5. Commit with a Conventional Commit scoped to this WP. The body must give the reasoning. Use this, adjusting only if a fact differs:

   ```text
   docs(WP01): amend the Charter to 1.2.0 (minor)

   Attendees following the talk on a phone have no Console, so they can't
   see what Quadrano says about a push. The shop may now repeat the runtime's
   Console output on the page, word for word, when a visitor turns on the
   Results view. The shop adds no text of its own and still never judges a
   push.

   Minor, not patch: the Charter did not state the "never judges" rule
   before, so this amendment adds it (QDR-007).

   The exception is one file: no-console is turned off for
   site/src/results/console-mirror.ts and nowhere else. The verdict-wording
   rule is unchanged. pnpm verify:results checks the rule still fires
   outside that file. Both land in the same pull request. The gate set and
   order are unchanged.

   Supersedes byo-gtm-container C-009 for the on-page panel only.

   Agent: <name>
   ```

**Files**: `.kittify/charter/charter.yaml` (only if it records the version)

**Validation**:
- [ ] `charter.yaml` and `charter.md` agree.
- [ ] Four headings present and unchanged.
- [ ] `pnpm gates` passes.
- [ ] Commit body states the reasoning and names no prior venture.

---

## Definition of Done

- [ ] `charter.md` is at 1.2.0 with the commit date.
- [ ] Bullet, enforcement row and log row match `contracts/charter-amendment.md` word for word.
- [ ] `charter.yaml` checked and in agreement; the outcome recorded in the Activity Log.
- [ ] `pnpm gates` passes.
- [ ] Only the two owned files changed.
- [ ] `spec-kitty agent tasks mark-status T001 T002 T003 T004 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| The contract's text reworded | Copy from the contract; reviewer diffs the three passages against it |
| A heading Spec Kitty reads is renamed | The grep in T004 step 3 |
| `charter.md` and `charter.yaml` drift | T004 steps 1 and 2 |
| The old version or type written by habit | The amendment is minor 1.2.0; search the diff for `1.1.2` and `Patch` in the new rows before committing |

## Review Guidance

- Diff the three inserted passages against `contracts/charter-amendment.md`. They must be identical apart from the date.
- Confirm the version, the header date and the log-row date agree.
- Confirm nothing else in `charter.md` changed.
- Re-run `pnpm gates` yourself.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
