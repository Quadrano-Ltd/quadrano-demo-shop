---
work_package_id: WP08
title: Release evidence and device check
dependencies:
- WP04
- WP06
- WP07
requirement_refs:
- FR-017
- SC-006
- SC-008
- NFR-004
- C-004
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
subtasks:
- T045
- T046
- T047
- T048
- T049
phase: Phase 5 - Release evidence
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: docs/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- docs/release-checks.md
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP08 – Release evidence and device check

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
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

Record, in `docs/release-checks.md`, the evidence that decides whether this mission may reach `main` before the talk on Thu 19 Nov 2026.

| Evidence | Requirement | Who runs it |
|---|---|---|
| Gates and non-gate checks on the merged tree | SC-008 | the agent |
| Lighthouse mobile LCP per page with the view off | NFR-004 | the agent, on a preview deployment |
| User Story 1 on one real iPhone and one real Android phone | FR-017, SC-006 | **the Product Owner** |
| The merge-timing decision that follows | C-004 | recorded by the agent, decided by the evidence |

**Done when**: `docs/release-checks.md` has a dated section for this mission holding all four; anything not yet run is marked "not yet run" with the exact remaining steps; nothing is claimed before it happens.

## Context & Constraints

- **Read first**: `quickstart.md` ("Device check" and "Page speed"); spec FR-017, SC-006, NFR-004, C-004 and the Assumptions; plan IC-06; the existing section "byo-gtm-container-01M64PAZ — gates and checks (WP11)" in `docs/release-checks.md`, which is the format to follow.
- **Recorded, not fabricated**: this file's standing rule. An agent can't hold a phone. Until the Product Owner reports results, the device check reads "not yet run". Record their results as they give them, with their words where it helps.
- **C-004**: the mission reaches `main` before Thu 19 Nov 2026 only if FR-017 is recorded first. Otherwise it stays unmerged until after the talk. This WP records which of the two applies; it doesn't merge anything.
- **Secrets (QDR-004)**: never write the production container ID. Where a built page would show it, write `GTM-*******` as the file already does. Preview and production hostnames are fine.
- **Pushing and deploying**: a preview deployment needs the mission branch pushed. Pushing is the Product Owner's call. If the branch isn't pushed yet, ask once, and meanwhile record the local results and mark the preview-dependent steps "not yet run".
- **Only this file**: if a check fails, report it against the owning WP. Don't fix code here.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP08 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T045 – Gates and checks on the merged tree

**Purpose**: SC-008: all four gates pass on the mission's final commit, and lint still fails a fixture that uses the Console outside the mirror.

**Steps**:

1. Add a new section to `docs/release-checks.md`, **before** the final `## Sign-off` section:

   ```markdown
   ## on-page-results-mirror-01M78JHF — gates, device check and page speed (WP08)
   ```

   Open it with two or three sentences saying what the section covers and which steps depend on the Product Owner.

2. Run each command in the WP08 worktree, on the tree that holds WP01 to WP07, and record the environment (OS, Node, pnpm, commit) as the earlier sections do:

   | Check | Command | Record |
   |---|---|---|
   | Dependencies | `pnpm install --frozen-lockfile` | exit code; "Lockfile is up to date"; package count unchanged from the previous mission (no new dependency, C-005) |
   | Gates | `pnpm gates` | the four stage lines and `gates: all 4 passed` |
   | Results lint proof | `pnpm verify:results` | every `ok` line; in particular the key check must now name both files (WP03 has landed) |
   | Container invariants | `pnpm verify:container` | still green |
   | Scenario invariants | `pnpm verify:scenarios` | still green |
   | Offline check | `pnpm build && pnpm verify:offline` | production `dist/` holds no offline-mode code |
   | E2E | `pnpm test:e2e` | total passed, duration, the count in the `offline` project |
   | Full-history no-secrets | `node scripts/no-secrets.ts --history` | `0 findings` |

3. **The failing fixture (SC-008's pair).** Repeat one probe from WP04 on the merged tree and record its output: add one line of Console use to `site/src/menu/playground.ts`, run `pnpm lint`, record the `no-console` error line, revert, and confirm `git status` is clean. This is the evidence that the gate itself, not only the verify script, still fails Console use outside the capture file.
4. If `pnpm verify:results` printed "results-setting.ts not present yet", the tree isn't the merged one. Stop and find out why.
5. CI: if the branch is pushed, record the `gates` workflow run ID and result (`gh run list --branch feat/on-page-results-mirror --limit 1`). If not, write "CI run — not yet available" with the reason, as earlier sections do.

**Files**: `docs/release-checks.md`

**Validation**:
- [ ] Every row has a real result from this tree.
- [ ] The probe was reverted.

### Subtask T046 – Lighthouse with the view off (NFR-004)

**Purpose**: With the view off, each page's LCP stays at most 2 seconds (Lighthouse mobile, default Slow 4G).

**Steps**:

1. Target: the Cloudflare Pages preview for `feat/on-page-results-mirror` (branch alias `feat-on-page-results-mirror.quadrano-demo-shop.pages.dev`). Record the deployment ID and commit. If there is no preview yet, run against `pnpm preview` locally, say so, and mark the preview run "not yet run".
2. Method, the same as the previous mission so the numbers compare: Lighthouse CLI, headless Chrome, mode Navigation, device Mobile, Performance only, default simulated throttling. A fresh profile per run, no extensions, the Demo menu closed, **no `results` parameter and no stored setting**.
3. Run each of the 5 pages at least once; run `/` three times to show the spread:

   | Page | LCP (score) |
   |---|---|
   | `/` | |
   | `/product/?id=SKU-1001` | |
   | `/basket/` | |
   | `/checkout/` | |
   | `/thank-you/` | |

4. State the result against the 2.0 s limit, and compare with the previous mission's table in the same file (every LCP there was at most 1.4 s).
5. For information only, not a requirement: one run of `/?results=on`. Record it in a sentence. The view being on isn't covered by NFR-004.
6. Record the document's transferred size for `/` with the view off, before and after this mission if you can get the earlier figure from the previous preview; the capture script adds about 1 KB inline and no request.

**Files**: `docs/release-checks.md`

**Validation**:
- [ ] 5 pages recorded with LCP and score.
- [ ] Result stated as pass or fail against 2.0 s.
- [ ] Target (preview or local) stated.

### Subtask T047 – Device-check pack

**Purpose**: Make FR-017 quick for the Product Owner, and make the record uniform.

**Steps**:

1. Under a heading `### T047/T048 — Real-device check (FR-017, SC-006)`, write the address to open:

   - Preview: `https://feat-on-page-results-mirror.quadrano-demo-shop.pages.dev/?results=on` (confirm the alias from the Pages deployment before writing it).
   - Or production, after merge: `https://demo.quadrano.com/?results=on`.

   FR-017 allows either. Before the talk, only the preview is possible without merging, and C-004 needs the record before the merge, so the preview is the one to use.

2. Say how to get it onto a phone: any QR generator pointed at that address, or type it. Don't commit a QR image; this WP owns one file.
3. Write the steps, from `quickstart.md`:

   1. Open the address on the phone (scan or type).
   2. Tap **Demo menu**.
   3. Tap a playground button, for example `purchase · 1 · Missing value`.
   4. Confirm a row appears at the top of **Results**.
   5. Tap the row. Read the problem lines and the pushed object.
   6. Tap `add_to_cart` and confirm a second row appears above the first.
   7. Scroll sideways: the page should not move.

   SC-006's measure is step 2 plus step 3: a result within 2 interactions of opening the link.

4. Add the record table, empty:

   | Device | OS version | Browser | Date | Address used | Result within 2 interactions? | Row text readable, no sideways scroll? | Notes |
   |---|---|---|---|---|---|---|---|
   | iPhone (model) | | Safari | | | | | |
   | Android phone (model) | | Chrome | | | | | |

5. Add a line on what to do if **"Quadrano hasn't loaded in this browser"** shows: note it in the table with any content blocker in use, then try once with the blocker off. That message appearing when GTM is blocked is the view working as specified (FR-010), but the check needs one run where Quadrano loads.
6. Mark the whole subsection **"Not yet run"** with the date you wrote it.
7. Tell the Product Owner the pack is ready: the address, the 7 steps, and that C-004 hangs on it. Do this in your hand-off message, not only in the file.

**Files**: `docs/release-checks.md`

**Validation**:
- [ ] Address, steps and empty table present.
- [ ] Marked "not yet run".

### Subtask T048 – Record the Product Owner's results

**Purpose**: FR-017 and SC-006.

**Steps**:

1. When the Product Owner reports results, fill in the table: device model, OS version, browser, date, the address used, and the outcome of each column.
2. Record what they saw in their words where it adds something ("the row opened and I could read…").
3. State the result for each of FR-017 and SC-006 as pass or fail, with the date.
4. If either phone fails: record exactly what happened, mark FR-017 **not met**, and report it against the owning WP (WP02 for capture, WP03 for the section). Don't soften it.
5. If the Product Owner hasn't run the check by the time the rest of this WP is done: leave the subsection "not yet run", and hand the WP over for review with that stated plainly. The reviewer should not approve FR-017 as met on an empty table. The WP can be approved as "evidence prepared, device check pending" only if the C-004 line (T049) says the mission stays unmerged.

**Files**: `docs/release-checks.md`

**Validation**:
- [ ] The table holds only results the Product Owner reported.
- [ ] One iPhone and one Android phone, or "not yet run".

### Subtask T049 – C-004 record and sign-off table

**Purpose**: Make the merge-timing rule visible where the release decision is made.

**Steps**:

1. Add a short subsection `### C-004 — may this reach main before the talk?` with one of two statements, whichever the evidence supports:

   - **Yes**: "FR-017 was recorded on (date), before the talk on Thu 19 Nov 2026. The mission may reach `main` by pull request with green gates."
   - **Not yet**: "FR-017 is not recorded. Under C-004 the mission stays unmerged until it is, or until after the talk on Thu 19 Nov 2026."

2. Add the sign-off table for this section, in the file's existing style:

   | Check | Status | PO initials |
   |---|---|---|
   | T045 — gates and checks on the merged tree | | |
   | T046 — Lighthouse LCP with the view off (NFR-004) | | |
   | T048 — real-device check, iPhone and Android (FR-017, SC-006) | | |
   | C-004 — merge before the talk | | |

   Fill in Status; leave the initials for the Product Owner.

3. Don't edit the earlier sections or the final `## Sign-off` table, which belongs to the first mission.
4. Run `pnpm gates` (no-secrets and provenance read this file). Search your additions for any container ID: there must be none.

**Files**: `docs/release-checks.md`

**Validation**:
- [ ] The C-004 statement matches the device-check table.
- [ ] `pnpm gates` passes.

---

## Definition of Done

- [ ] New dated section with T045's results table and the lint probe.
- [ ] Lighthouse table for 5 pages with the view off, with its target stated.
- [ ] Device-check pack present; results filled in from the Product Owner, or "not yet run".
- [ ] C-004 statement consistent with the evidence.
- [ ] No container ID written; earlier sections untouched.
- [ ] `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T045 T046 T047 T049 --status done --mission on-page-results-mirror-01M78JHF`, and `T048` only when the Product Owner's results are recorded.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A device check claimed that didn't happen | "Recorded, not fabricated"; T048 marked done only with real results |
| Merge before the talk without the record | The C-004 statement; the reviewer checks it against the table |
| Lighthouse run with the view on by mistake | Fresh profile, no parameter, stated in the method |
| Numbers not comparable with the last mission | Same tool, mode and throttling |
| The production container ID written down | Redact as `GTM-*******`; no-secrets gate |
| Checks run on a tree missing a WP | The `verify:results` key check names both files only on the merged tree |

## Review Guidance

- Re-run `pnpm gates` and `pnpm verify:results` yourself and compare with the record.
- Check the device table: real devices, dates and an address, or "not yet run". Nothing in between.
- Check the C-004 statement follows from the table.
- Confirm only `docs/release-checks.md` changed, by additions before the final Sign-off.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
