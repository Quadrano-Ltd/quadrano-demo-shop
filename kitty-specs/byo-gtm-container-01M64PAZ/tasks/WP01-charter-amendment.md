---
work_package_id: WP01
title: Charter 1.1.0 amendment
dependencies: []
requirement_refs:
- FR-025
- FR-003
- C-002
- C-008
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
phase: Phase 1 - Rulebook
history:
- at: '2026-10-29T22:01:50Z'
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

# Work Package Prompt: WP01 – Charter 1.1.0 amendment

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

Make the rulebook match what this mission builds, **before** any code relies on it (plan Charter Check, QDR-002 "Pass after amendment"). Charter QDR-007 says only the Architect proposes amendments; that is why this WP is assigned to the Architect profile. The Product Owner already approved the shape in decisions `DM-01M64RAA19WKDR4DQ969WWGG9A` (amendment) and `DM-01M64TAJ14KYVH94V2RCQPC8AY` (Playwright and axe).

This is a **minor** amendment, 1.0.1 → **1.1.0** (FR-025). It:

1. allows exactly one GTM container per page: the shop's own, or one the visitor types into the on-page menu, kept only in that visitor's browser for at most 24 hours, and never one named by the page address, a link or another site (QDR-002);
2. adds a "Dev tooling (not shipped)" row approving Playwright and axe for non-gate end-to-end and accessibility checks;
3. narrows QDR-004's wording to "the shop's own GTM container ID" (the rule itself does not change);
4. states that the demo-shop mission's NFR-004 (no extra network) and C-011 (no consent banner) cover only the shop's own container, and that demo-shop FR-003 is superseded by this mission's FR-001;
5. gives the mechanism statement QDR-007 demands.

**Done when**:
- `charter.md` and `charter.yaml` say the same thing for QDR-002 and QDR-004;
- `charter.md` shows `Version 1.1.0` with the amendment date, and the amendment log has the new row;
- the four headings Spec Kitty reads verbatim (*Policy Summary*, *Terminology Canon*, *Code Review Checklist*, *Regression Vigilance*) are untouched;
- `pnpm gates` passes;
- the commit message explains the reasoning.

## Context & Constraints

- **Read first**: `kitty-specs/byo-gtm-container-01M64PAZ/research.md` R-09 (the content of the amendment, nearly word for word), R-08 (supply-chain record for the two packages), plan "Charter Check".
- **Decisions**: `kitty-specs/byo-gtm-container-01M64PAZ/decisions/DM-01M64RAA19WKDR4DQ969WWGG9A.md` and `DM-01M64TAJ14KYVH94V2RCQPC8AY.md`. Read both; quote nothing that contradicts them.
- **Files**: `.kittify/charter/charter.md` (narrative) and `.kittify/charter/charter.yaml` (machine-readable; `directives.directives[]` with ids QDR-001 to QDR-007). There is no version field in `charter.yaml`; the version lives in `charter.md`'s header line.
- **Do not touch** `.kittify/charter/synthesis-manifest.yaml` or anything else generated under `.kittify/`.
- **Secrets**: never write a real-looking container ID. If an example is needed, use exactly `GTM-XXXXXXX`.
- **Terminology Canon** applies unchanged. "Container" is GTM's own term. No new domain terms.
- **Not in this WP**: the demo-shop spec annotations themselves (WP02), `AGENTS.md` (WP07), any code.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container` (reaches `main` later by PR)
- Execution worktrees are allocated per computed lane from `lanes.json`; `finalize-tasks` computed this WP's lane. Do not choose a base branch by hand.

Implementation command:

```bash
spec-kitty agent action implement WP01 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T001 – Amend QDR-002 (one container per page)

**Purpose**: The current text says "its own GTM container". Loading a visitor's container breaks that literally, so the rule must say exactly what is now allowed and what stays forbidden.

**Steps**:

1. In `charter.yaml`, replace the QDR-002 `description` with text equivalent to:

   > A static site (no backend, no accounts, no database) deployed to Cloudflare Pages at demo.quadrano.com. Each page loads exactly one GTM container, installed by a script tag: the shop's own container, or a container whose ID the visitor typed into the on-page menu, kept only in that visitor's browser for at most 24 hours. A container is never chosen by the page address, a link or another site. A dataLayer push on each user action. Anything not listed here, including any runtime or build dependency, needs a Charter amendment. Dev-only tooling listed in the Charter's approved stack is allowed for non-gate checks and is never shipped.

   Keep the YAML folded scalar style (`>-`) and 6-space indentation the file already uses.

2. In `charter.md` **Policy Summary**, rewrite the QDR-002 bullet to the same meaning in one sentence. Suggested:

   > - Use only the approved stack (QDR-002): a static site on Cloudflare Pages; each page loads exactly one GTM container, the shop's own or one the visitor types into the on-page menu (never one from the page address); no backend, accounts or database. Anything new needs a Charter amendment.

   Do **not** change the heading `## Policy Summary`.

3. In `charter.md` **Approved stack (QDR-002)** table, change the "Analytics / GTM" row to:

   > Exactly one GTM container per page, installed by a script tag: the shop's own, or one the visitor types into the on-page menu, kept only in that visitor's browser for at most 24 hours. Never one named by the page address, a link or another site. A `dataLayer` push on each user action.

4. Under the table, add a short scoping paragraph (research R-09 "Scoping"):

   > **Scope of the demo-shop rules (1.1.0).** The demo-shop mission's NFR-004 (no extra network) and C-011 (no consent banner) cover only the shop's own container; what a visitor's own container loads is the visitor's choice. Demo-shop FR-003 is superseded by FR-001 of mission `byo-gtm-container-01M64PAZ`.

**Validation**:
- [ ] Both files mention "exactly one" container per page, the two allowed sources, the 24-hour limit and the address ban.
- [ ] No wording permits two containers on a page, a default visitor ID, or an ID from a link.

### Subtask T002 – Dev tooling row and QDR-004 wording

**Purpose**: Approve the two dev dependencies under QDR-002 and keep QDR-004 precise now that a second kind of container exists.

**Steps**:

1. Add a row to the Approved stack table in `charter.md`:

   | Concern | Approved |
   |---|---|
   | Dev tooling (not shipped) | `@playwright/test` and `@axe-core/playwright` (with their transitive `playwright`, `playwright-core`, `axe-core`), for non-gate end-to-end and accessibility checks (`pnpm test:e2e`). Never shipped with the site, never run by the gates; browser binaries are fetched only by an explicit, documented command. Recorded in `AGENTS.md`. |

   Do not pin versions in the Charter; `AGENTS.md` and the lockfile hold versions.

2. QDR-004, in both files: change "The GTM container ID" to "The shop's own GTM container ID". In `charter.md` that is the Policy Summary bullet and the `## No secrets in the repo (QDR-004)` section; in `charter.yaml` the QDR-004 description. Add one sentence to the `charter.md` section:

   > Tests and docs use only the placeholder `GTM-XXXXXXX`, or IDs built while the tests run; a visitor's container ID is never written to the repository.

3. Check the Minimal quality gates section item 3 ("no secret-like value, and no GTM container ID, anywhere in the repo"). Leave it as is: the gate still rejects any real-looking container ID, which is stricter than QDR-004 and is what FR-019 wants.

**Validation**:
- [ ] `grep -n "GTM container ID" .kittify/charter/charter.*` shows only the narrowed wording where QDR-004 is stated.
- [ ] The dev tooling row says "not shipped" and "non-gate".

### Subtask T003 – Enforcement table, checklist and mechanism statement

**Purpose**: QDR-007: "changes the enforcing mechanism in the same pull request or states that none applies".

**Steps**:

1. In `## How the Charter is enforced`, add a row:

   | Rule | Enforced by |
   |---|---|
   | One container per page (QDR-002, 1.1.0) | The head loader built from `site/src/container/active-container.ts`; a lint override forbidding `location`, `document.referrer` and `URLSearchParams` in `site/src/container/**`; the non-gate `pnpm test:e2e` (one `gtm.js` request per page load in both states); review checklist item 4. |

2. Code Review Checklist item 4: widen to "no GTM container ID (the shop's or any real-looking one) or keys in code, config or commits; tests build IDs at run time". Keep the heading `## Code Review Checklist` exactly.

3. Write the **mechanism statement** as a paragraph at the end of the "How the Charter is enforced" section or in the amendment log row (pick one place; prefer the log row so it is dated):
   - no gate changes; the gate set and order are unchanged (QDR-003);
   - the no-secrets gate is unchanged in behaviour (its scanner is made importable in WP07 and a check proves it still fires);
   - existing lint rules are unchanged; one new lint override forbids reading the address in `site/src/container/**`;
   - `pnpm test:e2e` and `pnpm verify:container` are added as non-gate evidence.

**Validation**:
- [ ] Every rule changed in T001 and T002 has an enforcing mechanism named, or "none applies" stated.

### Subtask T004 – Version, date, log row, consistency check

**Steps**:

1. Header line: `**Version 1.1.0** · adopted 2026-10-24, amended <today, YYYY-MM-DD> · ratified when merged to \`main\` · see the [amendment log](#amendment-log)`.
2. Amendment log row (research R-09):

   `| 1.1.0 | <today> | Minor | One GTM container per page, the shop's or the visitor's, never from the address; Playwright and axe as dev-only tooling; demo-shop NFR-004 and C-011 scoped to the shop's own container. <mechanism statement from T003 if placed here> |`

3. Read `charter.md` and `charter.yaml` side by side for QDR-002 and QDR-004 and confirm they agree in meaning.
4. Confirm the four verbatim headings are byte-identical to before: `git diff .kittify/charter/charter.md | grep '^[-+]##'` must print nothing.
5. Run `spec-kitty charter status` and note its output in the Activity Log. If it reports the charter context as stale, run `spec-kitty charter context --action implement` once to confirm it renders, and record that. Do not hand-edit generated files.
6. Run `pnpm gates`.
7. Commit with a message whose body gives the reasoning, for example:

   ```text
   docs(charter): amend to 1.1.0 for one container per page and dev test tooling

   Why: mission byo-gtm-container-01M64PAZ lets a visitor bring their own GTM
   container so talk attendees can run Quadrano Local themselves. QDR-002 said
   "its own GTM container", so loading a visitor's container needs a new rule
   (minor). The page address can never choose a container, so a link can't run
   someone's code on the subdomain. Playwright and axe are approved as dev-only,
   non-gate tooling for NFR-001 and NFR-002 (DM-01M64TAJ14KYVH94V2RCQPC8AY).
   Mechanism: no gate changes; new lint override in site/src/container/**;
   test:e2e and verify:container as non-gate evidence.
   Decisions: DM-01M64RAA19WKDR4DQ969WWGG9A, DM-01M64TAJ14KYVH94V2RCQPC8AY.
   ```

**Validation**:
- [ ] Version 1.1.0, date present, log row present.
- [ ] `pnpm gates` → `gates: all 4 passed`.

---

## Definition of Done

- [ ] T001–T004 complete; `spec-kitty agent tasks mark-status T001 T002 T003 T004 --status done --mission byo-gtm-container-01M64PAZ`.
- [ ] Both charter files agree; verbatim headings unchanged.
- [ ] Gates pass; commit message gives reasoning and decision IDs.
- [ ] No container-ID-shaped literal other than `GTM-XXXXXXX`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `charter.md` and `charter.yaml` disagree | T004 step 3 side-by-side read; reviewer repeats it |
| A Spec Kitty-read heading is renamed | T004 step 4 diff check |
| Wording accidentally allows an address-set container | T001 validation; reviewer reads every edited sentence for "link", "address", "URL" |
| Over-reach (editing gates, AGENTS.md) | Owned files are only the two charter files |

## Review Guidance

- Compare against research R-09 point by point: QDR-002 text, dev tooling row, scoping, QDR-004 wording, mechanism statement, log row.
- Confirm "minor" is correct: a new rule is added; no rule is removed or weakened (QDR-004 is narrowed in wording, not in effect, and the gate is unchanged).
- Confirm the commit message carries the reasoning (QDR-007).

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
