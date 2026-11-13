---
work_package_id: WP04
title: Lint proof and documents
dependencies:
- WP02
- WP03
requirement_refs:
- FR-014
- FR-015
- FR-016
- SC-008
- C-005
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
subtasks:
- T020
- T021
- T022
- T023
- T024
- T025
phase: Phase 3 - The view
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: scripts/
create_intent:
- scripts/verify-results.ts
execution_mode: code_change
model: ''
owned_files:
- scripts/verify-results.ts
- package.json
- AGENTS.md
- README.md
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP04 – Lint proof and documents

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

Two things that keep the Console exception from spreading and keep the documents true:

1. **`pnpm verify:results`** (non-gate): proves the Console lint rule still fires everywhere in `site/` except the capture file, that the verdict-wording rule still fires inside the capture file, and that the capture file is self-contained (FR-014, SC-008).
2. **Documents**: the `AGENTS.md` code rule and Commands table, and the README's operator notes, describe the Results view and how to reach it on a phone (FR-016, and the "same pull request" list in `contracts/charter-amendment.md`).

**Done when**:

- `pnpm verify:results` exits 0 on the tree and prints one `ok` line per check.
- It exits non-zero in each of the five probes in T020, T021 and T022 (run once each, then reverted).
- `AGENTS.md` and `README.md` read as T024 and T025 say.
- `pnpm gates` passes.

## Context & Constraints

- **Read first**: `research.md` R-08 (the decision and its fallback), `contracts/charter-amendment.md` ("Same pull request"), spec FR-014, FR-016, SC-008, and `scripts/verify-container.ts` (the pattern to follow).
- **Not a gate (QDR-003)**: the gate set and order don't change. Don't add this script to `scripts/gates.ts`, the pre-push hook or CI.
- **No new dependencies (C-005)**: ESLint's Node API comes with the `eslint` package already installed.
- **A check that can never fail is removed** (Charter, Verification). Each check here has a probe that makes it fail; run the probes.
- **No fixture on disk under `site/`**: a file there that breaks the Console rule would fail `pnpm lint` itself. Lint text in memory (R-08).
- **Scripts may use the Console**: `eslint.config.js` already turns `no-console` off for `scripts/**/*.ts`.
- **The capture file** is `site/src/results/console-mirror.ts` (WP02). `site/src/results/results-setting.ts` comes from WP03. This WP depends on WP03, so the file is in your base. If it is missing, stop and report it; don't write a check that passes without it.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP04 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T020 – The Console rule fires outside the capture file and not inside it

**Purpose**: SC-008's paired check: "lint still fails a fixture that uses the Console outside the mirror".

**Steps**:

1. Create `scripts/verify-results.ts` with the same skeleton as `scripts/verify-container.ts`: a list of `[name, run]` checks, `ok <name>` or `not ok <name>: <message>` per line, exit 1 on any failure. Checks here are async, so type the list as `ReadonlyArray<readonly [string, () => Promise<void>]>` and `await` each.

2. Set up ESLint once:

   ```ts
   import assert from 'node:assert/strict';
   import { ESLint } from 'eslint';
   import { resolve } from 'node:path';

   const ROOT = resolve(import.meta.dirname, '..');
   const CAPTURE_FILE = 'site/src/results/console-mirror.ts';
   const OTHER_FILE = 'site/src/menu/playground.ts';
   const eslint = new ESLint({ cwd: ROOT });

   async function ruleIdsFor(text: string, file: string): Promise<string[]> {
     const [result] = await eslint.lintText(text, { filePath: resolve(ROOT, file) });
     return (result?.messages ?? []).map((message) => message.ruleId ?? '(fatal)');
   }
   ```

3. The fixture is one line of Console use, held as a string in the script:

   ```ts
   const CONSOLE_FIXTURE = "console.log('hello');\n";
   ```

4. Two checks:

   | Name | Asserts |
   |---|---|
   | `Console rule fires outside the capture file` | `ruleIdsFor(CONSOLE_FIXTURE, OTHER_FILE)` includes `no-console` |
   | `Console rule is off for the capture file` | `ruleIdsFor(CONSOLE_FIXTURE, CAPTURE_FILE)` doesn't include `no-console` |

   The second is the control for the first: together they show the rule depends on the path.

5. If a result contains a fatal parse or project-service error (ruleId `null`), fail the check with the message text. Don't treat "some error" as success.

**Fallback (R-08)**: type-aware linting of in-memory text relies on the project service accepting an existing file's path with replaced text. If it refuses, put a fixture file in a directory `eslint.config.js` already ignores (for example under `.e2e-dist/`, created and removed by the script at run time) and lint it with ignoring switched off (`new ESLint({ cwd: ROOT, ignore: false })`), using `overrideConfig` only to supply the `files` match, never to change rules. Record which route you took in the Activity Log.

**Files**: `scripts/verify-results.ts` (new)

**Validation**:
- [ ] Both checks print `ok`.
- [ ] Probe: in `eslint.config.js`, change the override's `files` to `['site/src/**/*.ts']`; the first check prints `not ok`. Revert.

### Subtask T021 – The override covers exactly one file; verdict wording still caught there

**Purpose**: The check "must fail if the override is widened" (R-08), and FR-014's "the verdict-wording rule stays on".

**Steps**:

1. **Every other file keeps the rule.** Walk `site/src` for `*.ts` files (not `*.d.ts`), and for each one ask ESLint for its resolved config:

   ```ts
   const config = await eslint.calculateConfigForFile(resolve(ROOT, file)) as {
     rules?: Record<string, unknown>;
   };
   const setting = config.rules?.['no-console'];
   ```

   A rule entry is a severity or an array whose first item is the severity (`0`, `1`, `2` or `'off'`, `'warn'`, `'error'`). Write a small `isError(setting)` helper that handles both forms.

   | Name | Asserts |
   |---|---|
   | `only the capture file may use the Console` | `no-console` is an error for every `site/src/**/*.ts` file except `CAPTURE_FILE`, and is off for `CAPTURE_FILE`; at least 20 files were checked |

   The "at least 20" guard stops the check passing on an empty walk.

2. **Verdict wording is still caught in the capture file.** Build the fixture at run time so this script holds no typed verdict literal of its own that a reader could mistake for shop text:

   ```ts
   const word = ['pass', 'ed'].join('');
   const VERDICT_FIXTURE = `export const label = '${word}';\n`;
   ```

   | Name | Asserts |
   |---|---|
   | `verdict wording is still caught in the capture file` | `ruleIdsFor(VERDICT_FIXTURE, CAPTURE_FILE)` includes `no-restricted-syntax` |
   | `network use is still caught in the capture file` | `ruleIdsFor("void fetch('/x');\n", CAPTURE_FILE)` includes `no-restricted-syntax` |
   | `data layer use is still caught in the capture file` | `ruleIdsFor('window.dataLayer = [];\n', CAPTURE_FILE)` includes `no-restricted-properties` |

3. **The override block itself.** Read `eslint.config.js` as text and assert that `site/src/results/console-mirror.ts` appears, and that no `files` entry starting `site/src/results/` contains `*`. This is a belt-and-braces text check; the config walk in step 1 is the real proof.

**Files**: `scripts/verify-results.ts`

**Validation**:
- [ ] All checks print `ok`.
- [ ] Probe: widen the override to `['site/src/results/**/*.ts']`. `only the capture file may use the Console` prints `not ok` naming `results-setting.ts`, and the text check in step 3 fails too. Revert.
- [ ] Probe: add `'no-restricted-syntax': 'off'` to the override; `verdict wording is still caught` prints `not ok`. Revert.

### Subtask T022 – The capture file is self-contained; its key matches

**Purpose**: The contract says the capture file has no imports, no exports and no closing script tag. The build already fails on these (WP02); this check gives the same answer without a build, and adds the cross-file key check.

**Steps**:

1. Read `site/src/results/console-mirror.ts` as text. Strip types the way the build does, without a build:

   ```ts
   import { stripTypeScriptTypes } from 'node:module';
   const stripped = stripTypeScriptTypes(source, { mode: 'strip' });
   ```

   `stripTypeScriptTypes` is in Node 24 (`node:module`). If it isn't available in 24.15.0 or prints an experimental warning that breaks the output format, use Vite's `transformWithOxc` as `vite.config.ts` does. Note which in the Activity Log.

2. Checks:

   | Name | Asserts on the stripped code |
   |---|---|
   | `capture file has no import or export` | no match for `/^\s*(?:import\|export)\b/m` or `/\bimport\s*\(/` |
   | `capture file has no closing script tag` | no match for `/<\/script/i` |
   | `capture file never touches the container or the data layer` | contains neither `demo-shop:visitor-container` nor `dataLayer` |
   | `capture file makes no request` | no match for `/\bfetch\s*\(\|XMLHttpRequest\|sendBeacon\|WebSocket\|EventSource/` |
   | `capture file reads no runtime internals` | doesn't contain `_quadrano` (C-001) |

3. Key agreement:

   | Name | Asserts |
   |---|---|
   | `the setting key is the same in both files` | `console-mirror.ts` and `site/src/results/results-setting.ts` both exist and both contain the literal `'demo-shop:results-view'` |

   A missing file is a failure: print `not ok the setting key is the same in both files: <file> not found`. Never print `ok` for a comparison that wasn't made (Charter: a check that can never fail is removed).

**Files**: `scripts/verify-results.ts`

**Validation**:
- [ ] All checks print `ok`.
- [ ] Probe: add `import './x.ts';` as the first line of the capture file; `capture file has no import or export` prints `not ok`. Revert.
- [ ] Probe: change one character of the key in `results-setting.ts` (for example `demo-shop:results-vieW`); `the setting key is the same in both files` prints `not ok`. Revert.
- [ ] The script as a whole passes `pnpm lint` (it is under `scripts/`, type-checked).

### Subtask T023 – `package.json`: the `verify:results` script

**Steps**:

1. Add one line to `scripts`, after `verify:offline`:

   ```json
   "verify:results": "node scripts/verify-results.ts",
   ```

2. Change nothing else in `package.json`. No dependency is added or changed; `pnpm-lock.yaml` must be untouched.
3. Run `pnpm verify:results` and paste its output into the Activity Log.

**Files**: `package.json`

**Validation**:
- [ ] `pnpm verify:results` exits 0.
- [ ] `git diff --stat` shows no change to `pnpm-lock.yaml`.

### Subtask T024 – `AGENTS.md`: code rule and Commands table

**Purpose**: The enforcing mechanism's documentation changes in the same pull request as the Charter (QDR-007).

**Steps**:

1. Under `## Code rules`, replace this line:

   ```markdown
   - No Console output and no verdict wording in `site/` (FR-017, enforced by lint).
   ```

   with this, word for word from `contracts/charter-amendment.md`:

   ```markdown
   - No verdict wording in `site/`, and no Console use except in `site/src/results/console-mirror.ts`, which repeats the runtime's output (FR-017, Charter 1.2.0, enforced by lint).
   ```

2. In the `## Commands` table, add a row after `pnpm verify:container`:

   ```markdown
   | `pnpm verify:results` | the Console lint rule still fires outside the capture file; verdict wording is still caught inside it; the capture file is self-contained (not a gate) | non-zero on any violation |
   ```

3. In the `pnpm test:e2e` row, the description can stay as it is. Don't list every suite.
4. Change nothing else. In particular, the dev-dependency table doesn't change.

**Files**: `AGENTS.md`

**Validation**:
- [ ] The code rule equals the contract's text.
- [ ] The table still renders.

### Subtask T025 – `README.md`: operator notes

**Purpose**: FR-016. The presenter needs to know how attendees on phones reach the view, and that the stage path doesn't change.

**Steps**:

1. Add a new section after `## Before going on stage` and before `## If the venue network fails`. Use this text; adjust wording only where a fact differs from what was built:

   ```markdown
   ## Attendees on phones (Results view)

   A phone has no Console, so the Demo menu can repeat Quadrano's Console output on the page.

   - **Link for a slide or QR code:** `https://demo.quadrano.com/?results=on`. It opens the shop with the view on. The attendee opens **Demo menu** and presses a playground button; the result appears under the Event playground.
   - **Without the link:** open **Demo menu** and turn on **Show Quadrano's output on this page**. The page reloads.
   - **This tab only.** The choice is kept in the tab's session storage. A new tab starts with the view off.
   - **Off by default.** With the view off, nothing about the page changes, so the stage path is as before. Don't use the link in the browser you present from: with the view on, DevTools names the shop, not the snippet, as the source of each Console line.
   - **Every word is Quadrano's.** The shop repeats the runtime's text and adds none of its own. It still never judges a push.
   - **"Quadrano hasn't loaded in this browser"** means the runtime's first line never appeared. On a phone the likely cause is a content blocker stopping GTM.
   - The link never sets or changes the container.
   ```

2. In `## What it is`, the sentence "The shop pushes data and never judges it" stays true. Leave it.
3. In the `## Run locally` code block, add one line after `pnpm verify:scenarios`:

   ```bash
   pnpm verify:results       # the Console lint rule still fires outside the Results capture file
   ```

**Files**: `README.md`

**Validation**:
- [ ] The section sits between the two named sections.
- [ ] The only container-ID-shaped text anywhere in the README is still absent or `GTM-XXXXXXX`.
- [ ] `pnpm gates` passes (no-secrets and provenance read these files).

---

## Definition of Done

- [ ] `pnpm verify:results` passes; its output is in the Activity Log.
- [ ] Five probes run and reverted, each with its `not ok` line recorded: override widened to all of `site/src`; override widened to `site/src/results/**`; verdict rule turned off in the override; an import added to the capture file; the key changed in `results-setting.ts`.
- [ ] `package.json` gained one script line; lockfile untouched.
- [ ] `AGENTS.md` and `README.md` updated as specified.
- [ ] Not added to the gates.
- [ ] `pnpm gates` passes; `git status` shows no probe left behind.
- [ ] `spec-kitty agent tasks mark-status T020 T021 T022 T023 T024 T025 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A check that can't fail | Five probes, each recorded |
| In-memory typed linting refuses replaced text | Fallback in T020; record the route taken |
| A probe left in the tree | `git status` and `git diff` before committing |
| The script becomes a gate by accident | It isn't referenced from `scripts/gates.ts`, the hook or CI |
| Empty file walk passes | "at least 20 files" guard |
| Key drift between the two files | T022's key check, which fails if either file is missing or the literals differ |

## Review Guidance

- Run `pnpm verify:results` yourself, then repeat at least two of the five probes.
- Read the script for any check that asserts on something it set up itself.
- Compare the `AGENTS.md` code rule with `contracts/charter-amendment.md`.
- Confirm `pnpm-lock.yaml` is unchanged and `scripts/gates.ts` is untouched.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
